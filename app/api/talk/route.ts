import { describeError, hasKey, speak, structured, StructuredError } from "@/lib/llm";
import { thinkerSystem } from "@/lib/prompts/common";
import { moderatorPrompt, speakerTurnPrompt, type TurnRole } from "@/lib/prompts/talk";
import { moderatorSchema, talkRequestSchema } from "@/lib/schemas";
import { createEventStream } from "@/lib/sse";
import type { FrameworkId, SessionBrief, ThinkerId, TranscriptEntry } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REBUTTALS = 1;

export async function POST(req: Request) {
  const parsed = talkRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ message: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const { session, tag, only, oneOnOne, continueDebate } = parsed.data;
  const transcript: TranscriptEntry[] = [...parsed.data.transcript];
  const out = createEventStream();
  const speakAs = (speaker: ThinkerId, role: TurnRole) => streamSpeaker(speaker, role, session, transcript, out.send, req.signal);
  const known = new Set((session.facts ?? []).map((f) => f.toLowerCase()));

  (async () => {
    try {
      if (!hasKey()) {
        out.send({ type: "error", code: "no_key", message: "No API key is configured on the server (OPENAI_API_KEY or ANTHROPIC_API_KEY)." });
        return;
      }

      // Retry a single failed speaker.
      if (only) {
        await speakAs(only, { kind: "answer", focus: "Pick up where the table left off.", tagged: false });
        return;
      }

      if (oneOnOne) {
        if (!session.seats.includes(oneOnOne)) {
          out.send({ type: "notice", text: "That thinker isn't at the table." });
          return;
        }
        out.send({ type: "plan", speakers: [oneOnOne], decisionDetected: false, suggestedFramework: "gate" });
        await speakAs(oneOnOne, { kind: "oneOnOne" });
        return;
      }

      if (tag === "socrates") {
        if (!session.socratesEnabled) {
          out.send({ type: "notice", text: "Socrates isn't invited to this table." });
        } else if (session.socratesUsed) {
          out.send({ type: "notice", text: "Socrates has asked his question. He watches in silence now." });
        } else {
          out.send({ type: "plan", speakers: ["socrates"], decisionDetected: false, suggestedFramework: "gate" });
          await speakAs("socrates", { kind: "socrates" });
          out.send({ type: "socrates_used" });
        }
        return;
      }

      // A table turn: 2 answers on one sharp focus (3 if someone was tagged), then 1 rebuttal.
      const plan = await planTurn(session, transcript, tag, Boolean(continueDebate));
      out.send({ type: "plan", speakers: plan.speakers, decisionDetected: plan.decisionDetected, suggestedFramework: plan.suggestedFramework });
      const fresh = plan.facts.filter((f) => !known.has(f.toLowerCase()));
      if (fresh.length) {
        out.send({ type: "facts", facts: fresh });
        session.facts = [...(session.facts ?? []), ...fresh];
      }
      if (plan.focus) out.send({ type: "focus", text: plan.focus });
      for (const speaker of plan.speakers) {
        if (req.signal.aborted) return;
        await speakAs(speaker, { kind: "answer", focus: plan.focus, tagged: speaker === tag });
      }
      for (const r of plan.rebuttals) {
        if (req.signal.aborted) return;
        await speakAs(r.speaker, { kind: "rebut", focus: plan.focus, replyTo: r.replyTo });
      }
    } catch (err) {
      const { code, message } = describeError(err);
      out.send({ type: "error", code, message });
    } finally {
      out.send({ type: "done" });
      out.close();
    }
  })();

  return out.response;
}

interface Plan {
  focus: string;
  speakers: ThinkerId[];
  rebuttals: { speaker: ThinkerId; replyTo: ThinkerId }[];
  facts: string[];
  decisionDetected: boolean;
  suggestedFramework: FrameworkId;
}

async function planTurn(session: SessionBrief, transcript: TranscriptEntry[], tag: ThinkerId | undefined, continuing: boolean): Promise<Plan> {
  const lastSpeakers = lastTurnSpeakers(transcript);
  let plan: Plan;
  try {
    const { system, user } = moderatorPrompt(session, transcript, lastSpeakers, continuing);
    const res = await structured(moderatorSchema(session.seats), { system, user, maxTokens: 700 });
    plan = {
      focus: res.focus.trim(),
      speakers: res.speakers as ThinkerId[],
      rebuttals: res.rebuttals.map((r) => ({ speaker: r.speaker as ThinkerId, replyTo: r.replyTo as ThinkerId })),
      facts: res.facts.map((f) => f.trim()).filter((f) => f && f.length <= 120).slice(0, 5),
      decisionDetected: res.decisionDetected,
      suggestedFramework: res.suggestedFramework,
    };
  } catch (err) {
    // API-level failures (auth, billing, rate limit) would hit every speaker too: surface them.
    if (!(err instanceof StructuredError)) throw err;
    // Moderator output failed twice: the two who spoke least recently answer, the first one rebuts.
    const quiet = [...session.seats].sort((a, b) => lastSpokeIndex(transcript, a) - lastSpokeIndex(transcript, b)).slice(0, 2);
    plan = {
      focus: "What is the single biggest thing the user is getting wrong about this?",
      speakers: quiet,
      rebuttals: quiet.length === 2 ? [{ speaker: quiet[0], replyTo: quiet[1] }] : [],
      facts: [],
      decisionDetected: false,
      suggestedFramework: "gate",
    };
  }

  if (tag && session.seats.includes(tag)) plan.speakers = [tag, ...plan.speakers];
  plan.speakers = [...new Set(plan.speakers)].filter((s) => session.seats.includes(s)).slice(0, tag ? 3 : 2);
  if (plan.speakers.length === 0) plan.speakers = session.seats.slice(0, 2);
  // A rebuttal must answer someone who spoke this turn, and never themselves.
  plan.rebuttals = plan.rebuttals
    .filter((r) => r.speaker !== r.replyTo && session.seats.includes(r.speaker) && plan.speakers.includes(r.replyTo))
    .slice(0, MAX_REBUTTALS);
  if (plan.rebuttals.length === 0 && plan.speakers.length >= 2) {
    plan.rebuttals = [{ speaker: plan.speakers[0], replyTo: plan.speakers[plan.speakers.length - 1] }];
  }
  return plan;
}

async function streamSpeaker(
  speaker: ThinkerId,
  role: TurnRole,
  session: SessionBrief,
  transcript: TranscriptEntry[],
  send: ReturnType<typeof createEventStream>["send"],
  signal: AbortSignal,
) {
  const oneOnOne = role.kind === "oneOnOne";
  const messageId = crypto.randomUUID();
  send({ type: "speaker_start", messageId, speakerId: speaker, oneOnOne: oneOnOne || undefined, replyTo: role.kind === "rebut" ? role.replyTo : undefined });
  let text = "";
  try {
    for await (const chunk of speak({
      system: thinkerSystem(speaker, session, oneOnOne),
      user: speakerTurnPrompt(session, transcript, speaker, role),
      maxTokens: oneOnOne ? 1600 : undefined,
      signal,
    })) {
      text += chunk;
      send({ type: "delta", messageId, text: chunk });
    }
    send({ type: "speaker_end", messageId });
    // Later speakers in this turn see what was just said.
    transcript.push({ kind: "thinker", speakerId: speaker, text, oneOnOne: oneOnOne ? speaker : undefined });
  } catch (err) {
    if (text) transcript.push({ kind: "thinker", speakerId: speaker, text });
    send({ type: "speaker_error", messageId, error: describeError(err).message });
  }
}

/** Who spoke in the previous table turn (skipping the user's new message, if any). */
function lastTurnSpeakers(transcript: TranscriptEntry[]): ThinkerId[] {
  const out: ThinkerId[] = [];
  let i = transcript.length - 1;
  while (i >= 0 && transcript[i].kind === "user") i--;
  for (; i >= 0; i--) {
    const e = transcript[i];
    if (e.kind === "user") break;
    if (e.kind === "thinker" && e.speakerId) out.push(e.speakerId);
  }
  return out;
}

function lastSpokeIndex(transcript: TranscriptEntry[], id: ThinkerId): number {
  for (let i = transcript.length - 1; i >= 0; i--) if (transcript[i].speakerId === id) return i;
  return -1;
}
