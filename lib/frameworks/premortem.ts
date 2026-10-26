import type { PremortemCall, PremortemCause, PremortemComputed, PremortemThinkerScore, ThinkerId } from "@/lib/types";

export const TOP_N = 5;
/** A cause is critical when both likelihood and damage are at least this, with no credible mitigation. */
export const CRITICAL = 4;
/** Mitigation credibility (1-5) below this counts as "no credible mitigation". */
export const CREDIBLE = 3;

export function causesFrom(scores: PremortemThinkerScore[]): PremortemCause[] {
  return scores
    .filter((s) => s.cause?.cause.trim())
    .map((s) => ({ id: `cause-${s.thinkerId}`, thinkerId: s.thinkerId, ...s.cause! }));
}

type Rating = { likelihood: number; damage: number; mitigationCredible: number };

function callFor(rated: { likelihood: number; damage: number; mitigationCredible: number }[]): PremortemCall {
  const critical = rated.filter((r) => r.likelihood >= CRITICAL && r.damage >= CRITICAL && r.mitigationCredible < CREDIBLE).length;
  return critical === 0 ? "proceed" : critical === 1 ? "revise" : "stop";
}

export function premortemTag(call: PremortemCall): string {
  return call.toUpperCase();
}

export function computePremortem(causes: PremortemCause[], scores: PremortemThinkerScore[], abstained: ThinkerId[] = []): PremortemComputed {
  const counted = scores.filter((s) => !abstained.includes(s.thinkerId));
  const ranked = causes
    .map((c) => {
      const rs = counted.map((s) => s.ratings?.find((r) => r.causeId === c.id)).filter((r): r is Rating & { causeId: string } => Boolean(r));
      const avg = (k: keyof Rating) => (rs.length ? round(rs.reduce((a, r) => a + r[k], 0) / rs.length) : 0);
      const likelihood = avg("likelihood");
      const damage = avg("damage");
      const mitigationCredible = avg("mitigationCredible");
      return {
        ...c,
        likelihood,
        damage,
        mitigationCredible,
        risk: round(likelihood * damage),
        critical: likelihood >= CRITICAL && damage >= CRITICAL && mitigationCredible < CREDIBLE,
      };
    })
    .sort((a, b) => b.risk - a.risk || b.likelihood - a.likelihood)
    .slice(0, TOP_N);

  const thinkerVotes = scores.map((s) => {
    if (abstained.includes(s.thinkerId) || !s.ratings?.length) return { thinkerId: s.thinkerId, vote: abstained.includes(s.thinkerId) ? "ABSTAIN" : "RISK" };
    return { thinkerId: s.thinkerId, vote: premortemTag(callFor(s.ratings)) };
  });

  const call = callFor(ranked);
  const critical = ranked.filter((r) => r.critical).length;
  const trace = [
    `Each risk is scored as how likely times how bad (1 to 5 each), averaged over ${counted.length} thinkers. The worst ${ranked.length} of ${causes.length} are kept.`,
    `A risk is critical when both scores are ${CRITICAL} or more and nobody has a believable fix. Found: ${critical}.`,
    `${critical === 0 ? "No critical risks, so: go ahead." : critical === 1 ? "One critical risk, so: rethink it first." : `${critical} critical risks, so: stop.`}`,
  ];

  return {
    framework: "premortem",
    trace,
    ranked,
    call,
    warningChecklist: ranked.map((r) => r.warningSign).filter(Boolean),
    thinkerVotes: [...thinkerVotes, ...abstained.filter((id) => !scores.some((s) => s.thinkerId === id)).map((id) => ({ thinkerId: id, vote: "ABSTAIN" }))],
    tally: {
      for: thinkerVotes.filter((v) => v.vote === "PROCEED").length,
      against: thinkerVotes.filter((v) => v.vote === "REVISE" || v.vote === "STOP").length,
      abstained: abstained.length,
    },
  };
}

/** One thinker's call from their own ratings. */
export function thinkerCall(score: PremortemThinkerScore): string {
  return score.ratings?.length ? premortemTag(callFor(score.ratings)) : "RISK";
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
