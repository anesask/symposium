import "server-only";
import { z } from "zod";
import { STATION_LABELS } from "@/config/gate";
import { ROSTER } from "@/config/roster";
import { structured, StructuredError } from "@/lib/llm";
import { computeGate, defaultGateSetup, thinkerVote } from "@/lib/frameworks/gate";
import { formatTranscript, questionLine, voterSystem } from "@/lib/prompts/common";
import { STATIONS, type GateSetup, type GateThinkerScore, type GateVote, type ThinkerId, type VoteChange } from "@/lib/types";
import type { FrameworkAdapter, VoteContext } from "./types";

const labelsSchema = z.object({
  finance: z.array(z.string()),
  risk: z.array(z.string()),
  market: z.array(z.string()),
  personal: z.array(z.string()),
  longterm: z.array(z.string()),
});

const votesSchema = z.object({
  votes: z.array(
    z.object({
      criterionId: z.string(),
      vote: z.enum(["GO", "NO-GO", "CONDITIONAL"]),
      reason: z.string(),
      condition: z.string(),
    }),
  ),
});

const revisedSchema = votesSchema.extend({ because: z.string() });

function ownedStations(setup: GateSetup, id: ThinkerId) {
  return setup.stations.filter((s) => s.ownerId === id);
}

function criteriaBrief(setup: GateSetup, id: ThinkerId) {
  return ownedStations(setup, id)
    .map(
      (s) =>
        `${STATION_LABELS[s.station]}${s.covering ? " (you are covering this station for the table)" : ""}:\n` +
        s.criteria.map((c) => `  - ${c.id}: ${c.label}${c.mustPass ? " [MUST PASS]" : ""}`).join("\n"),
    )
    .join("\n");
}

function toScore(setup: GateSetup, id: ThinkerId, votes: z.infer<typeof votesSchema>["votes"]): GateThinkerScore {
  const stations = ownedStations(setup, id).map((s) => ({
    station: s.station,
    votes: s.criteria.map((c) => {
      const v = votes.find((x) => x.criterionId.trim() === c.id);
      if (!v) throw new StructuredError(`missing vote for ${c.id}`);
      return {
        criterionId: c.id,
        vote: v.vote as GateVote,
        reason: v.reason.trim(),
        condition: v.vote === "GO" ? undefined : v.condition.trim() || undefined,
      };
    }),
  }));
  return { framework: "gate", thinkerId: id, stations };
}

/** Validates and retries once if the model skipped a criterion. */
async function scoreWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!(err instanceof StructuredError)) throw err;
    return fn();
  }
}

function situation(ctx: VoteContext) {
  return `${questionLine(ctx.session)}
${ctx.whatIf ? `\nNEW FACT for this re-run (it changes the situation; take it seriously): "${ctx.whatIf}"\n` : ""}
Conversation so far:
${formatTranscript(ctx.transcript)}`;
}

const VOTE_RULES = `Vote on each criterion: GO, NO-GO or CONDITIONAL, with a one-line reason in your own voice.
- CONDITIONAL means "yes, if something specific happens first".
- For every NO-GO or CONDITIONAL, give a "condition": a SHORT imperative action with a measurable check, under 10 words, that would make it a GO (e.g. "Build a 3-month cash runway", "Sign a second retainer before resigning", "Cap debt at €1,000"). For GO, use "".
- Keep each reason to one short sentence (under 20 words).
- Be honest in character, and let your lean decide the close calls. Don't be agreeable for the sake of it. A MUST PASS criterion voted NO-GO blocks the whole decision, so use it only when you mean it.`;

export const gateAdapter: FrameworkAdapter<GateSetup, GateThinkerScore> = {
  framework: "gate",

  async setup(ctx) {
    const base = defaultGateSetup(ctx.session.seats);
    // Re-runs keep the same criteria so the was → now comparison lines up.
    if (ctx.previous?.setup.framework === "gate") {
      const prev = ctx.previous.setup;
      return { ...base, stations: base.stations.map((s) => ({ ...s, criteria: prev.stations.find((p) => p.station === s.station)?.criteria ?? s.criteria })) };
    }
    try {
      const labels = await structured(labelsSchema, {
        system: `You prepare a Go/No-Go gate review (like a stage-gate or launch-readiness review) for a personal decision. Rewrite generic criteria so they are specific to this decision. Keep each label under 9 words, phrased as a statement that can be a GO.`,
        user: `${situation(ctx)}

Rewrite each station's 3 criteria for this specific decision, keeping the same intent and order:
${STATIONS.map((s) => `${s}: ${base.stations.find((x) => x.station === s)!.criteria.map((c) => `"${c.label}"`).join(", ")}`).join("\n")}`,
        maxTokens: 1024,
      });
      return defaultGateSetup(ctx.session.seats, labels);
    } catch (err) {
      if (err instanceof StructuredError) return base;
      throw err;
    }
  },

  score(ctx, setup, id) {
    return scoreWithRetry(async () => {
      const res = await structured(votesSchema, {
        system: voterSystem(id, "voting in a Go/No-Go gate"),
        user: `${situation(ctx)}
${
  ctx.previous?.framework === "gate"
    ? `\nYour votes last time, before the new fact:\n${(ctx.previous.scores as GateThinkerScore[])
        .find((s) => s.thinkerId === id)
        ?.stations.flatMap((s) => s.votes.map((v) => `  - ${v.criterionId}: ${v.vote} (${v.reason})`))
        .join("\n") ?? "(none)"}\n`
    : ""
}
You own these stations. Vote on every criterion id listed:
${criteriaBrief(setup, id)}

${VOTE_RULES}`,
        maxTokens: 1500,
      });
      return toScore(setup, id, res.votes);
    });
  },

  voteTag(setup, score) {
    return thinkerVote(setup, score);
  },

  summarize(setup, scores) {
    return setup.stations
      .map((st) => {
        const s = scores.find((x) => x.thinkerId === st.ownerId);
        const votes = s?.stations.find((x) => x.station === st.station)?.votes ?? [];
        return `${STATION_LABELS[st.station]} (${ROSTER[st.ownerId].name}${st.covering ? ", covering" : ""}):\n${st.criteria
          .map((c) => {
            const v = votes.find((x) => x.criterionId === c.id);
            return `  - ${c.label}${c.mustPass ? " [must pass]" : ""}: ${v ? `${v.vote}, ${v.reason}` : "abstained"}`;
          })
          .join("\n")}`;
      })
      .join("\n");
  },

  debate(setup, scores) {
    const tagged = scores.map((s) => ({ id: s.thinkerId, tag: thinkerVote(setup, s), s }));
    const severity = (t: string) => (t === "NO-GO" ? 2 : t === "GO, IF" ? 1 : 0);
    const sorted = [...tagged].sort((a, b) => severity(b.tag) - severity(a.tag));
    const hawk = sorted[0];
    const dove = sorted[sorted.length - 1];
    const middle = sorted.find((x) => x !== hawk && x !== dove && x.tag === "GO, IF");
    const speakers = [hawk.id, dove.id, ...(middle ? [middle.id] : [])].filter((v, i, a) => a.indexOf(v) === i);
    if (speakers.length < 2 && scores.length > 1) speakers.push(scores.find((s) => s.thinkerId !== hawk.id)!.thinkerId);
    const focus =
      hawk.tag === dove.tag
        ? `The table broadly agrees (${hawk.tag}). Stress-test it: argue about the weakest criterion and whether any condition is really enough.`
        : `${ROSTER[hawk.id].name} says ${hawk.tag}; ${ROSTER[dove.id].name} says ${dove.tag}. Argue it out.`;
    return { focus, speakers };
  },

  async revise(ctx, setup, score, _all, debate) {
    return scoreWithRetry(async () => {
      const id = score.thinkerId;
      const res = await structured(revisedSchema, {
        system: voterSystem(id, "re-casting your Go/No-Go votes after the debate"),
        user: `${situation(ctx)}

Your votes before the debate:
${score.stations.flatMap((s) => s.votes.map((v) => `  - ${v.criterionId}: ${v.vote} (${v.reason})${v.condition ? ` [condition: ${v.condition}]` : ""}`)).join("\n")}

The debate:
${formatTranscript(debate) || "(no debate)"}

Re-cast your votes on the same criteria:
${criteriaBrief(setup, id)}

Change a vote only if a specific argument in the debate changed your mind (name it in "because"); otherwise keep it exactly. Don't move just to agree with the table. "because": if you changed anything, one line on what (or who) changed your mind; else "".

${VOTE_RULES}`,
        maxTokens: 1500,
      });
      return { score: toScore(setup, id, res.votes), because: res.because.trim() };
    });
  },

  diff(setup, before, after, because) {
    const out: VoteChange[] = [];
    for (const st of after.stations) {
      for (const v of st.votes) {
        const prev = before.stations.find((s) => s.station === st.station)?.votes.find((x) => x.criterionId === v.criterionId);
        if (prev && prev.vote !== v.vote) {
          const label = setup.stations.flatMap((s) => s.criteria).find((c) => c.id === v.criterionId)?.label ?? v.criterionId;
          out.push({ thinkerId: after.thinkerId, what: label, from: prev.vote, to: v.vote, because: because || v.reason });
        }
      }
    }
    return out;
  },

  compute(setup, scores, abstained) {
    return computeGate(setup, scores, abstained);
  },

  pollInstruction: `Format each line as the thinker's call first, then the reason, e.g. "No-go until the second retainer is signed." or "Go. The runway math works." For GO, IF say "Go, if ..." with the key condition.`,
};
