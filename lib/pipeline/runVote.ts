import "server-only";
import { z } from "zod";
import { ROSTER } from "@/config/roster";
import { speak, structured } from "@/lib/llm";
import { formatTranscript, questionLine, thinkerSystem } from "@/lib/prompts/common";
import type { ThinkerId, ThinkerScore, TranscriptEntry, VoteChange, VoteResult } from "@/lib/types";
import type { FrameworkAdapter, VoteContext } from "./types";

const POLL_GAP_MS = 650;

/** setup → scores (parallel) → debate (2-3 streamed turns) → revisions → poll → computed result. */
export async function runVote(adapter: FrameworkAdapter, ctx: VoteContext): Promise<VoteResult | null> {
  const { send, resultId, session } = ctx;
  const framework = adapter.framework;
  const seats = session.seats;

  // ---- setup
  send({ type: "phase", resultId, phase: "setup", framework });
  const setup = await adapter.setup(ctx);
  send({ type: "setup", resultId, setup });

  // ---- scores, in parallel; a thinker whose scoring fails twice abstains
  send({ type: "phase", resultId, phase: "scores", framework });
  const abstained: ThinkerId[] = [];
  const first = await Promise.all(
    seats.map(async (id) => {
      try {
        const score = await adapter.score(ctx, setup, id);
        return score;
      } catch (err) {
        if (isFatal(err)) throw err;
        abstained.push(id);
        send({ type: "abstain", resultId, thinkerId: id });
        return null;
      }
    }),
  );
  let scores = first.filter((s): s is ThinkerScore => s !== null);
  for (const s of scores) send({ type: "score", resultId, score: s, voteTag: adapter.voteTag(setup, s, scores) });
  if (scores.length < Math.ceil(seats.length / 2)) {
    send({ type: "error", code: "failed", message: "Most of the table couldn't score this. Try calling the vote again." });
    return null;
  }

  // ---- debate
  send({ type: "phase", resultId, phase: "debate", framework });
  const plan = adapter.debate(setup, scores);
  const debate: TranscriptEntry[] = [];
  // In a pre-mortem, Socrates (if invited and unused) opens by asking what the user refuses to look at.
  if (framework === "premortem" && session.socratesEnabled && !session.socratesUsed) {
    const q = await streamDebateTurn(ctx, "socrates", adapter.summarize(setup, scores), "Ask the user what they are refusing to look at.", debate);
    if (q) debate.push({ kind: "thinker", speakerId: "socrates", text: q });
    send({ type: "socrates_used" });
  }
  for (const speaker of plan.speakers.filter((s) => !abstained.includes(s)).slice(0, 3)) {
    if (ctx.signal.aborted) return null;
    const text = await streamDebateTurn(ctx, speaker, adapter.summarize(setup, scores), plan.focus, debate);
    if (text) debate.push({ kind: "thinker", speakerId: speaker, text });
  }

  // ---- revisions (everyone may change their mind after the debate)
  const changes: VoteChange[] = [];
  const revised = await Promise.all(
    scores.map(async (s) => {
      try {
        const r = await adapter.revise(ctx, setup, s, scores, debate);
        const diff = adapter.diff(setup, s, r.score, r.because);
        return { before: s, after: r.score, diff };
      } catch (err) {
        if (isFatal(err)) throw err;
        return { before: s, after: s, diff: [] as VoteChange[] };
      }
    }),
  );
  scores = revised.map((r) => r.after);
  for (const r of revised) {
    if (r.diff.length || adapter.framework === "premortem") {
      changes.push(...r.diff);
      send({
        type: "score_changed",
        resultId,
        thinkerId: r.after.thinkerId,
        score: r.after,
        voteTag: adapter.voteTag(setup, r.after, scores),
        changes: r.diff,
      });
    }
  }

  // ---- poll, out loud, one line per thinker
  send({ type: "phase", resultId, phase: "poll", framework });
  const computed = adapter.compute(setup, scores, abstained);
  const tags = new Map(computed.thinkerVotes.map((v) => [v.thinkerId, v.vote]));
  const lines = await pollLines(ctx, adapter, adapter.summarize(setup, scores), tags, abstained);
  for (const id of seats) {
    if (abstained.includes(id)) continue;
    send({
      type: "poll_line",
      resultId,
      messageId: crypto.randomUUID(),
      thinkerId: id,
      text: lines.get(id) ?? fallbackPollLine(tags.get(id)),
      voteTag: tags.get(id) ?? "ABSTAIN",
    });
    await sleep(POLL_GAP_MS, ctx.signal);
  }

  // ---- result
  send({ type: "phase", resultId, phase: "result", framework });
  const result: VoteResult = {
    id: resultId,
    framework,
    createdAt: Date.now(),
    trigger: ctx.whatIf ? "rerun" : "vote",
    whatIf: ctx.whatIf,
    setup,
    scores,
    abstained,
    changes,
    pollLines: seats.filter((id) => !abstained.includes(id)).map((id) => ({ thinkerId: id, line: lines.get(id) ?? "" })),
    computed,
    previousResultId: ctx.previous?.id,
    causes: adapter.causes?.(scores),
  };
  send({ type: "result", result });
  return result;
}

async function streamDebateTurn(
  ctx: VoteContext,
  speaker: ThinkerId,
  summary: string,
  focus: string,
  debate: TranscriptEntry[],
): Promise<string> {
  const messageId = crypto.randomUUID();
  ctx.send({ type: "speaker_start", messageId, speakerId: speaker, resultId: ctx.resultId });
  let text = "";
  try {
    for await (const chunk of speak({
      system: thinkerSystem(speaker, ctx.session),
      user: speaker === "socrates"
        ? `Conversation so far:
${formatTranscript(ctx.transcript)}

The table is imagining how this fails:
${summary}

Ask your one question now: what is the user refusing to look at?`
        : `Conversation before the vote:
${formatTranscript(ctx.transcript)}

The vote has been called. The table's scores so far:
${summary}

${focus}
${debate.length ? `\nThe debate so far:\n${formatTranscript(debate)}\n` : ""}
It's your turn in the debate, ${ROSTER[speaker].name}. Challenge the score you most disagree with, or defend yours against the last speaker, by name. If someone has convinced you, say so plainly. 2-3 sentences.`,
      signal: ctx.signal,
    })) {
      text += chunk;
      ctx.send({ type: "delta", messageId, text: chunk });
    }
    ctx.send({ type: "speaker_end", messageId });
  } catch (err) {
    if (isFatal(err)) throw err;
    ctx.send({ type: "speaker_error", messageId, error: "lost their train of thought" });
  }
  return text;
}

async function pollLines(
  ctx: VoteContext,
  adapter: FrameworkAdapter,
  summary: string,
  tags: Map<ThinkerId, string>,
  abstained: ThinkerId[],
): Promise<Map<ThinkerId, string>> {
  const voting = ctx.session.seats.filter((id) => !abstained.includes(id));
  const schema = z.object({
    lines: z.array(z.object({ thinkerId: z.enum(voting as [string, ...string[]]), line: z.string() })),
  });
  try {
    const res = await structured(schema, {
      system: `You write the moderator's out-loud poll at Symposium, in the style of a NASA launch poll. The moderator calls each thinker by name and each answers in ONE short line, in their own voice: their call, plus the single reason or condition that matters most. Under 18 words each. No preamble.`,
      user: `${questionLine(ctx.session)}
${ctx.whatIf ? `New fact for this re-run: "${ctx.whatIf}"\n` : ""}
Scores after the debate:
${summary}

Final call per thinker (they must match this call):
${voting.map((id) => `- ${id} (${ROSTER[id].name}): ${tags.get(id)}`).join("\n")}

${adapter.pollInstruction}
Write one line for each thinker id above.`,
      maxTokens: 1024,
    });
    return new Map(res.lines.map((l) => [l.thinkerId as ThinkerId, l.line.trim()]));
  } catch (err) {
    if (isFatal(err)) throw err;
    return new Map();
  }
}

function fallbackPollLine(tag: string | undefined) {
  return tag ? `${tag}.` : "Abstain.";
}

/** Errors that would hit every call (auth, billing, rate limit) abort the whole vote. */
function isFatal(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 401 || status === 403 || status === 429 || (status === 400 && /credit|billing/i.test(String(err)));
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      resolve();
    });
  });
}
