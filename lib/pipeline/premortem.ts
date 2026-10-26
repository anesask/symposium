import "server-only";
import { z } from "zod";
import { ROSTER } from "@/config/roster";
import { structured, StructuredError } from "@/lib/llm";
import { causesFrom, computePremortem, thinkerCall } from "@/lib/frameworks/premortem";
import { formatTranscript, questionLine, voterSystem } from "@/lib/prompts/common";
import type { PremortemSetup, PremortemThinkerScore } from "@/lib/types";
import type { FrameworkAdapter, VoteContext } from "./types";

export const PREMISE = "It is 12 months later. You did it. It failed.";

const planSchema = z.object({ plan: z.string() });
const causeSchema = z.object({ cause: z.string(), warningSign: z.string(), mitigation: z.string() });
const ratingsSchema = z.object({
  ratings: z.array(z.object({ causeId: z.string(), likelihood: z.number(), damage: z.number(), mitigationCredible: z.number() })),
  because: z.string(),
});

const clamp = (n: number) => Math.max(1, Math.min(5, Math.round(n)));

function situation(ctx: VoteContext) {
  return `${questionLine(ctx.session)}
${ctx.whatIf ? `\nNEW FACT for this re-run (it changes the situation; take it seriously): "${ctx.whatIf}"\n` : ""}
Conversation so far:
${formatTranscript(ctx.transcript)}`;
}

function causesBrief(scores: PremortemThinkerScore[]) {
  return causesFrom(scores)
    .map((c) => `- ${c.id} (${ROSTER[c.thinkerId].name}): ${c.cause} | early warning: ${c.warningSign} | mitigation: ${c.mitigation}`)
    .join("\n");
}

export const premortemAdapter: FrameworkAdapter<PremortemSetup, PremortemThinkerScore> = {
  framework: "premortem",

  async setup(ctx) {
    try {
      const res = await structured(planSchema, {
        system: "Summarize, in one sentence starting with a verb, the plan the user has decided on (or is leaning towards). No preamble.",
        user: situation(ctx),
        maxTokens: 200,
      });
      return { framework: "premortem", premise: PREMISE, plan: res.plan.trim() };
    } catch (err) {
      if (!(err instanceof StructuredError)) throw err;
      return { framework: "premortem", premise: PREMISE, plan: ctx.session.question };
    }
  },

  async score(ctx, setup, id) {
    const t = ROSTER[id];
    const res = await structured(causeSchema, {
      system: voterSystem(id, "running a pre-mortem (Gary Klein)"),
      user: `${situation(ctx)}

The plan: ${setup.plan}
${setup.premise}

From your point of view (${t.stationLabel}), write the single MOST LIKELY reason it failed. Be specific to this user, not generic. Then the earliest warning sign they could have noticed, and one concrete mitigation. One short sentence each (under 22 words), in your own voice.`,
      maxTokens: 600,
    });
    if (!res.cause.trim()) throw new StructuredError("empty cause");
    return { framework: "premortem", thinkerId: id, cause: { cause: res.cause.trim(), warningSign: res.warningSign.trim(), mitigation: res.mitigation.trim() } };
  },

  voteTag(_setup, score) {
    return thinkerCall(score);
  },

  summarize(_setup, scores) {
    const rated = scores.some((s) => s.ratings?.length);
    if (!rated) return causesBrief(scores);
    const c = computePremortem(causesFrom(scores), scores);
    return c.ranked.map((r) => `- ${r.cause} (likelihood ${r.likelihood}, damage ${r.damage}, mitigation ${r.mitigationCredible}/5)`).join("\n");
  },

  debate(_setup, scores) {
    // The two thinkers whose causes are furthest apart in kind argue which failure is likeliest.
    const ids = scores.map((s) => s.thinkerId);
    return {
      focus: `Each thinker named the most likely way this fails:\n${causesBrief(scores)}\nArgue which failure is MOST likely and most damaging, and whether the proposed mitigations would actually work.`,
      speakers: ids.length > 2 ? [ids[0], ids[ids.length - 1], ids[Math.floor(ids.length / 2)]] : ids,
    };
  },

  async revise(ctx, setup, score, all, debate) {
    const id = score.thinkerId;
    const causes = causesFrom(all);
    const res = await structured(ratingsSchema, {
      system: voterSystem(id, "rating the failure causes after the debate"),
      user: `${situation(ctx)}

The plan: ${setup.plan}
${setup.premise}

The failure causes on the table:
${causesBrief(all)}

The debate:
${formatTranscript(debate) || "(no debate)"}

Rate EVERY cause id above, in character:
- likelihood 1-5 (how likely this is the reason it fails)
- damage 1-5 (how bad it is if it happens)
- mitigationCredible 1-5 (would the proposed mitigation really prevent it?)
Use the full range. "because": one line on the risk you'd fix first.`,
      maxTokens: 1200,
    });
    const ratings = causes.map((c) => {
      const r = res.ratings.find((x) => x.causeId.trim() === c.id);
      if (!r) throw new StructuredError(`missing rating for ${c.id}`);
      return { causeId: c.id, likelihood: clamp(r.likelihood), damage: clamp(r.damage), mitigationCredible: clamp(r.mitigationCredible) };
    });
    return { score: { ...score, ratings }, because: res.because.trim() };
  },

  diff() {
    return [];
  },

  compute(_setup, scores, abstained) {
    return computePremortem(causesFrom(scores), scores, abstained);
  },

  causes(scores) {
    return causesFrom(scores);
  },

  pollInstruction: `Each thinker gives their call (proceed, revise or stop) and names the single risk they'd fix first, e.g. "Revise. Fix the onboarding before you spend a cent on ads."`,
};

