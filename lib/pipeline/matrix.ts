import "server-only";
import { z } from "zod";
import { ROSTER } from "@/config/roster";
import { structured, StructuredError } from "@/lib/llm";
import { computeMatrix, CONTESTED_SPREAD } from "@/lib/frameworks/matrix";
import { formatTranscript, questionLine, voterSystem } from "@/lib/prompts/common";
import type { MatrixSetup, MatrixThinkerScore, SessionBrief, ThinkerId, TranscriptEntry, VoteChange } from "@/lib/types";
import type { FrameworkAdapter, VoteContext } from "./types";

const setupSchema = z.object({
  options: z.array(z.string()),
  criteria: z.array(z.object({ label: z.string(), weight: z.number() })),
});

const cellsSchema = z.object({
  cells: z.array(z.object({ optionId: z.string(), criterionId: z.string(), score: z.number(), reason: z.string() })),
});
const revisedSchema = cellsSchema.extend({ because: z.string() });

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));
const slug = (s: string, i: number) => `${s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "item"}-${i + 1}`;

/** Proposes 2-4 options and 5 weighted criteria from the conversation (used by /api/vote/setup). */
export async function proposeMatrixSetup(session: SessionBrief, transcript: TranscriptEntry[]): Promise<MatrixSetup> {
  const res = await structured(setupSchema, {
    system: `You set up a weighted decision matrix (Pugh-style) for a personal decision. Extract the real options the user is choosing between and propose the criteria that matter for THIS decision.`,
    user: `${questionLine(session)}

Conversation:
${formatTranscript(transcript)}

Return:
- options: the 2 to 4 options being compared, as short labels (1-4 words). If only one option is named, add the obvious alternative (e.g. "Stay put").
- criteria: exactly 5 criteria, short labels (1-4 words), each with a weight 1-5 reflecting how much it seems to matter to this user.`,
    maxTokens: 800,
  });
  const options = [...new Set(res.options.map((o) => o.trim()).filter(Boolean))].slice(0, 4);
  if (options.length < 2) throw new StructuredError("fewer than 2 options");
  const criteria = res.criteria.filter((c) => c.label.trim()).slice(0, 5);
  if (criteria.length < 2) throw new StructuredError("too few criteria");
  return {
    framework: "matrix",
    options: options.map((label, i) => ({ id: slug(label, i), label })),
    criteria: criteria.map((c, i) => ({ id: slug(c.label, i), label: c.label.trim(), weight: clamp(c.weight, 1, 5) })),
  };
}

function grid(setup: MatrixSetup) {
  return `Options (ids): ${setup.options.map((o) => `${o.id} = "${o.label}"`).join("; ")}
Criteria (ids, weight 1-5): ${setup.criteria.map((c) => `${c.id} = "${c.label}" (w${c.weight})`).join("; ")}`;
}

function toScore(setup: MatrixSetup, id: ThinkerId, cells: z.infer<typeof cellsSchema>["cells"]): MatrixThinkerScore {
  const out = setup.options.flatMap((o) =>
    setup.criteria.map((c) => {
      const cell = cells.find((x) => x.optionId.trim() === o.id && x.criterionId.trim() === c.id);
      if (!cell) throw new StructuredError(`missing cell ${o.id}/${c.id}`);
      return { optionId: o.id, criterionId: c.id, score: clamp(cell.score, 1, 5), reason: cell.reason.trim() };
    }),
  );
  return { framework: "matrix", thinkerId: id, cells: out };
}

async function retryOnce<T>(fn: () => Promise<T>): Promise<T> {
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

const SCORE_RULES = `Score EVERY option on EVERY criterion from 1 (terrible) to 5 (excellent), in character, from your own point of view, with a one-line reason each. Use the full range; don't hedge everything to 3.`;

function cellLabel(setup: MatrixSetup, optionId: string, criterionId: string) {
  return `${setup.options.find((o) => o.id === optionId)?.label} on ${setup.criteria.find((c) => c.id === criterionId)?.label}`;
}

export const matrixAdapter: FrameworkAdapter<MatrixSetup, MatrixThinkerScore> = {
  framework: "matrix",

  async setup(ctx) {
    if (ctx.matrixSetup?.options?.length && ctx.matrixSetup.criteria?.length) {
      // The user's edited setup, sanitized.
      const m = ctx.matrixSetup;
      return {
        framework: "matrix",
        options: m.options.slice(0, 4).map((o, i) => ({ id: String(o.id || slug(o.label, i)), label: String(o.label).slice(0, 60) })),
        criteria: m.criteria.slice(0, 6).map((c, i) => ({ id: String(c.id || slug(c.label, i)), label: String(c.label).slice(0, 60), weight: clamp(Number(c.weight) || 3, 1, 5) })),
      };
    }
    if (ctx.previous?.setup.framework === "matrix") return ctx.previous.setup;
    return proposeMatrixSetup(ctx.session, ctx.transcript);
  },

  score(ctx, setup, id) {
    return retryOnce(async () => {
      const res = await structured(cellsSchema, {
        system: voterSystem(id, "scoring a decision matrix"),
        user: `${situation(ctx)}

${grid(setup)}

${SCORE_RULES}
Return one cell per option × criterion, using the ids above.`,
        maxTokens: 3000,
      });
      return toScore(setup, id, res.cells);
    });
  },

  voteTag(setup, score) {
    return computeMatrix(setup, [score]).ranking[0]?.label ?? "ABSTAIN";
  },

  summarize(setup, scores) {
    return setup.options
      .map(
        (o) =>
          `${o.label}:\n${setup.criteria
            .map((c) => `  - ${c.label} (w${c.weight}): ${scores.map((s) => `${ROSTER[s.thinkerId].shortName} ${s.cells.find((x) => x.optionId === o.id && x.criterionId === c.id)?.score ?? "-"}`).join(", ")}`)
            .join("\n")}`,
      )
      .join("\n");
  },

  debate(setup, scores) {
    const computed = computeMatrix(setup, scores);
    const contested = [...computed.cells].filter((c) => c.spread >= CONTESTED_SPREAD).sort((a, b) => b.spread - a.spread).slice(0, 2);
    const focusCells = contested.length ? contested : [...computed.cells].sort((a, b) => b.spread - a.spread).slice(0, 1);
    const speakers: ThinkerId[] = [];
    for (const cell of focusCells) {
      const vals = scores.map((s) => ({ id: s.thinkerId, v: s.cells.find((x) => x.optionId === cell.optionId && x.criterionId === cell.criterionId)?.score ?? 0 }));
      vals.sort((a, b) => a.v - b.v);
      speakers.push(vals[0].id, vals[vals.length - 1].id);
    }
    const unique = [...new Set(speakers)].slice(0, 3);
    const focus = `The biggest disagreements: ${focusCells.map((c) => `${cellLabel(setup, c.optionId, c.criterionId)} (scores ${scores.map((s) => s.cells.find((x) => x.optionId === c.optionId && x.criterionId === c.criterionId)?.score).join("/")})`).join("; ")}. Argue those cells.`;
    return { focus, speakers: unique.length >= 2 ? unique : [...new Set([...unique, ...scores.map((s) => s.thinkerId)])].slice(0, 2) };
  },

  async revise(ctx, setup, score, _all, debate) {
    return retryOnce(async () => {
      const id = score.thinkerId;
      const res = await structured(revisedSchema, {
        system: voterSystem(id, "re-scoring a decision matrix after the debate"),
        user: `${situation(ctx)}

${grid(setup)}

Your scores before the debate:
${score.cells.map((c) => `  - ${c.optionId}/${c.criterionId}: ${c.score} (${c.reason})`).join("\n")}

The debate:
${formatTranscript(debate) || "(no debate)"}

Re-score every cell. Change a score only if the debate genuinely moved you. "because": one line on what changed your mind, or "" if nothing did.
${SCORE_RULES}`,
        maxTokens: 3000,
      });
      return { score: toScore(setup, id, res.cells), because: res.because.trim() };
    });
  },

  diff(setup, before, after, because) {
    const out: VoteChange[] = [];
    for (const c of after.cells) {
      const prev = before.cells.find((x) => x.optionId === c.optionId && x.criterionId === c.criterionId);
      if (prev && Math.abs(prev.score - c.score) >= 1) {
        out.push({ thinkerId: after.thinkerId, what: cellLabel(setup, c.optionId, c.criterionId), from: String(prev.score), to: String(c.score), because: because || c.reason });
      }
    }
    return out.slice(0, 3);
  },

  compute(setup, scores, abstained) {
    return computeMatrix(setup, scores, abstained);
  },

  pollInstruction: `Each thinker names the option they'd pick and the one reason, e.g. "Lisbon. Quality of life wins, and the pay gap is smaller than it looks." The call given for each thinker is the option they pick.`,
};
