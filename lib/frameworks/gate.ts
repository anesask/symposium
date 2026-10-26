import { COVER_PREFERENCE, DEFAULT_CRITERIA } from "@/config/gate";
import { ROSTER } from "@/config/roster";
import {
  STATIONS,
  type GateComputed,
  type GateCriterion,
  type GateSetup,
  type GateThinkerScore,
  type GateVote,
  type Station,
  type ThinkerId,
  type VoteTag,
} from "@/lib/types";

/** Pass threshold for a clean GO (share of non-abstained criteria voted GO). */
export const GO_SHARE = 0.6;
export const MAX_CONDITIONS = 5;

/**
 * Gives every station exactly one owner. A thinker owns their native station; when two
 * share one, the more fitting one owns it (COVER_PREFERENCE order). Unowned stations go to
 * the closest thinker, preferring someone who owns nothing yet, and are labelled "covering".
 */
export function assignStations(seats: ThinkerId[]): { station: Station; ownerId: ThinkerId; covering: boolean }[] {
  const seated = seats.filter((s) => s !== "socrates");
  const owner = new Map<Station, { ownerId: ThinkerId; covering: boolean }>();
  const load = new Map<ThinkerId, number>(seated.map((s) => [s, 0]));
  const byPreference = (station: Station) => {
    const pref = COVER_PREFERENCE[station];
    return [...seated].sort((a, b) => rank(pref, a) - rank(pref, b));
  };

  for (const station of STATIONS) {
    const native = byPreference(station).filter((t) => ROSTER[t].station === station);
    if (native.length) {
      owner.set(station, { ownerId: native[0], covering: false });
      load.set(native[0], load.get(native[0])! + 1);
    }
  }
  for (const station of STATIONS) {
    if (owner.has(station)) continue;
    const candidates = byPreference(station);
    const minLoad = Math.min(...candidates.map((c) => load.get(c)!));
    const pick = candidates.find((c) => load.get(c) === minLoad)!;
    owner.set(station, { ownerId: pick, covering: true });
    load.set(pick, load.get(pick)! + 1);
  }
  return STATIONS.map((station) => ({ station, ...owner.get(station)! }));
}

function rank(pref: ThinkerId[], id: ThinkerId) {
  const i = pref.indexOf(id);
  return i === -1 ? 99 : i;
}

/** Setup with default criteria; the pipeline swaps in decision-specific labels. */
export function defaultGateSetup(seats: ThinkerId[], labels?: Partial<Record<Station, string[]>>): GateSetup {
  return {
    framework: "gate",
    stations: assignStations(seats).map((a) => ({
      ...a,
      criteria: DEFAULT_CRITERIA[a.station].map((c, i) => ({ ...c, label: labels?.[a.station]?.[i]?.trim() || c.label })),
    })),
  };
}

const SEVERITY: Record<GateVote | "ABSTAIN", number> = { ABSTAIN: -1, GO: 0, CONDITIONAL: 1, "NO-GO": 2 };

/** One thinker's overall vote tag, from the stations they scored. */
export function thinkerVote(setup: GateSetup, score: GateThinkerScore | undefined): VoteTag {
  if (!score) return "ABSTAIN";
  const mustPass = new Set(setup.stations.flatMap((s) => s.criteria.filter((c) => c.mustPass).map((c) => c.id)));
  const votes = score.stations.flatMap((s) => s.votes);
  if (!votes.length) return "ABSTAIN";
  const nogo = votes.filter((v) => v.vote === "NO-GO");
  // NO-GO only when they block a must-pass, or most of their answers are a flat no.
  // "Conditional" is a yes-with-terms, so it counts towards GO, IF, not against.
  if (nogo.some((v) => mustPass.has(v.criterionId)) || nogo.length > votes.length / 2) return "NO-GO";
  if (votes.some((v) => v.vote !== "GO")) return "GO, IF";
  return "GO";
}

export function computeGate(setup: GateSetup, scores: GateThinkerScore[], abstained: ThinkerId[] = []): GateComputed {
  const byThinker = new Map(scores.filter((s) => !abstained.includes(s.thinkerId)).map((s) => [s.thinkerId, s]));

  const scorecard = setup.stations.map((st) => {
    const score = byThinker.get(st.ownerId);
    const votes = score?.stations.find((x) => x.station === st.station)?.votes ?? [];
    const criteria = st.criteria.map((c) => {
      const v = votes.find((x) => x.criterionId === c.id);
      return v
        ? { ...c, vote: v.vote, reason: v.reason, condition: v.condition }
        : { ...c, vote: "ABSTAIN" as const, reason: "No vote recorded." };
    });
    const status = criteria.reduce<GateVote | "ABSTAIN">(
      (worst, c) => (SEVERITY[c.vote] > SEVERITY[worst] ? c.vote : worst),
      "ABSTAIN",
    );
    return { station: st.station, ownerId: st.ownerId, covering: st.covering, status, criteria };
  });

  const all = scorecard.flatMap((s) => s.criteria);
  const counted = all.filter((c) => c.vote !== "ABSTAIN");
  const goCount = counted.filter((c) => c.vote === "GO").length;
  const goShare = counted.length ? goCount / counted.length : 0;
  const blockers = counted.filter((c) => c.mustPass && c.vote === "NO-GO");

  const verdict = blockers.length ? "NO-GO" : goShare >= GO_SHARE ? "GO" : "GO, IF";
  const flipCondition = blockers.length ? asCondition(blockers[0]) : undefined;

  const conditions = dedupe([
    ...counted.filter((c) => c.vote === "CONDITIONAL" && c.mustPass).map(asCondition),
    ...counted.filter((c) => c.vote === "CONDITIONAL" && !c.mustPass).map(asCondition),
    ...counted.filter((c) => c.vote === "NO-GO" && !c.mustPass).map(asCondition),
  ])
    .filter((c) => c !== flipCondition)
    .slice(0, MAX_CONDITIONS);

  const openRisks = dedupe([
    ...counted.filter((c) => c.vote === "NO-GO").map((c) => c.reason),
    ...abstained.map((id) => `${ROSTER[id].name} abstained, so their station was scored without them.`),
  ]).slice(0, 4);

  const seated = [...new Set([...setup.stations.map((s) => s.ownerId), ...scores.map((s) => s.thinkerId), ...abstained])];
  const thinkerVotes = seated.map((id) => ({
    thinkerId: id,
    vote: abstained.includes(id) ? "ABSTAIN" : thinkerVote(setup, byThinker.get(id)),
  }));

  const count = (v: GateVote) => counted.filter((c) => c.vote === v).length;
  const abstainedCriteria = all.length - counted.length;
  const pct = Math.round(goShare * 100);
  // In plain words: this is printed on the verdict scroll.
  const trace = [
    `They answered ${counted.length} questions: ${count("GO")} clear yes, ${count("CONDITIONAL")} yes with a condition, ${count("NO-GO")} no${abstainedCriteria ? `, ${abstainedCriteria} skipped` : ""}.`,
    blockers.length
      ? `“${blockers[0].label}” is a must-have, and it got a no${blockers.length > 1 ? ` (so did ${blockers.length - 1} more)` : ""}. That alone means: not yet.`
      : "None of the must-haves got a no.",
    ...(blockers.length
      ? []
      : [`${pct}% were a clear yes. ${goShare >= GO_SHARE ? `That's at least ${GO_SHARE * 100}%, so: yes.` : `That's under ${GO_SHARE * 100}%, so: yes, if the conditions are met.`}`]),
  ];

  return {
    framework: "gate",
    trace,
    verdict,
    goShare,
    flipCondition,
    conditions,
    openRisks,
    scorecard,
    thinkerVotes,
    tally: {
      for: thinkerVotes.filter((v) => v.vote === "GO" || v.vote === "GO, IF").length,
      against: thinkerVotes.filter((v) => v.vote === "NO-GO").length,
      abstained: thinkerVotes.filter((v) => v.vote === "ABSTAIN").length,
    },
  };
}

function asCondition(c: GateCriterion & { condition?: string; reason: string }): string {
  return (c.condition?.trim() || `Make "${c.label}" a clear yes`).replace(/\.$/, "");
}

const STOP = new Set(["a", "an", "the", "and", "or", "of", "to", "your", "you", "before", "first", "get", "in", "on", "for", "with", "at", "least"]);
const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, "");
function words(x: string) {
  return new Set(x.toLowerCase().split(/[^a-z0-9€]+/).filter((w) => w && !STOP.has(w)).map(stem));
}

/** Drops empty lines and near-duplicates (most of the same key words), keeping the first. */
export function dedupe(xs: string[]): string[] {
  const kept: { x: string; w: Set<string> }[] = [];
  for (const x of xs) {
    if (!x.trim()) continue;
    const w = words(x);
    const dup = kept.some((k) => {
      const shared = [...w].filter((t) => k.w.has(t)).length;
      return shared / Math.max(1, Math.min(w.size, k.w.size)) >= 0.75;
    });
    if (!dup) kept.push({ x, w });
  }
  return kept.map((k) => k.x);
}
