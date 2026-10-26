import { ROOMS } from "@/config/rooms";
import { stripDashes } from "@/lib/text";

const FRAMEWORK_NAMES = { gate: "Go / No-Go gate", matrix: "decision matrix", premortem: "pre-mortem" } as const;
import type {
  FrameworkId,
  FrameworkSetup,
  Message,
  Mode,
  RoomId,
  ServerEvent,
  ThinkerId,
  ThinkerScore,
  VotePhase,
  VoteResult,
  VoteTag,
} from "@/lib/types";

export interface LiveVote {
  resultId: string;
  framework: FrameworkId;
  phase: VotePhase;
  trigger: "vote" | "rerun";
  whatIf?: string;
  setup?: FrameworkSetup;
  scores: Partial<Record<ThinkerId, ThinkerScore>>;
  abstained: ThinkerId[];
  changed: ThinkerId[];
}

export interface Session {
  id: string;
  roomId: RoomId;
  seats: ThinkerId[];
  socratesEnabled: boolean;
  socratesUsed: boolean;
  question: string;
  messages: Message[];
  results: VoteResult[];
  activeResultId?: string;
  mode: Mode;
  decisionDetected: boolean;
  suggestedFramework: FrameworkId;
  /** Latest vote tag per thinker, shown under portraits in Decide/Results. */
  voteTags: Partial<Record<ThinkerId, VoteTag>>;
  vote?: LiveVote;
  /** Set while the user talks privately with one thinker. */
  oneOnOne?: ThinkerId;
  /** Facts the user has stated, picked out by the moderator or added by hand. */
  facts?: string[];
}

export interface State {
  session: Session | null;
  busy: boolean;
  error?: { code: string; message: string };
  notice?: string;
}

export type Action =
  | { type: "start_session"; session: Session }
  | { type: "restore"; session: Session | null }
  | { type: "reset" }
  | { type: "user_message"; message: Message }
  | { type: "fact"; message: Message }
  | { type: "drop_message"; messageId: string }
  | { type: "event"; event: ServerEvent }
  | { type: "busy"; busy: boolean }
  | { type: "clear_error" }
  | { type: "set_mode"; mode: Mode }
  | { type: "select_result"; resultId: string }
  | { type: "begin_vote"; resultId: string; framework: FrameworkId; trigger: "vote" | "rerun"; whatIf?: string }
  | { type: "end_vote"; resultId: string }
  | { type: "set_one_on_one"; thinkerId?: ThinkerId }
  | { type: "set_seats"; seats: ThinkerId[] }
  | { type: "set_facts"; facts: string[] }
  | { type: "add_message"; message: Message };

export const initialState: State = { session: null, busy: false };

export function newSession(input: {
  roomId: RoomId;
  seats: ThinkerId[];
  question: string;
  socratesEnabled: boolean;
}): Session {
  return {
    id: uid(),
    roomId: input.roomId,
    seats: input.seats,
    socratesEnabled: input.socratesEnabled,
    socratesUsed: false,
    question: input.question,
    messages: [
      { id: uid(), kind: "moderator", text: ROOMS[input.roomId].opening, status: "done" },
      { id: uid(), kind: "user", text: input.question, status: "done" },
    ],
    results: [],
    mode: "talk",
    decisionDetected: false,
    suggestedFramework: "gate",
    voteTags: {},
    facts: [],
  };
}

export function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function updateMessage(s: Session, id: string, fn: (m: Message) => Message): Session {
  return { ...s, messages: s.messages.map((m) => (m.id === id ? fn(m) : m)) };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "start_session":
      return { session: action.session, busy: false };
    case "restore":
      return { ...state, session: action.session };
    case "reset":
      return { session: null, busy: false };
    case "busy":
      return { ...state, busy: action.busy };
    case "clear_error":
      return { ...state, error: undefined, notice: undefined };
    default:
      break;
  }
  const s = state.session;
  if (!s) return state;

  switch (action.type) {
    case "user_message":
    case "fact":
      return { ...state, error: undefined, notice: undefined, session: { ...s, messages: [...s.messages, action.message] } };
    case "drop_message":
      return { ...state, session: { ...s, messages: s.messages.filter((m) => m.id !== action.messageId) } };
    case "set_mode":
      return { ...state, session: { ...s, mode: action.mode } };
    case "select_result": {
      const r = s.results.find((x) => x.id === action.resultId);
      return {
        ...state,
        session: {
          ...s,
          activeResultId: action.resultId,
          mode: "results",
          voteTags: r ? Object.fromEntries(r.computed.thinkerVotes.map((v) => [v.thinkerId, v.vote])) : s.voteTags,
        },
      };
    }
    case "set_one_on_one":
      return { ...state, session: { ...s, oneOnOne: action.thinkerId } };
    case "end_vote":
      // Only matters if the stream ended without a result (error/abort): drop the live vote.
      if (s.vote?.resultId !== action.resultId) return state;
      return {
        ...state,
        session: {
          ...s,
          vote: undefined,
          mode: s.activeResultId ? "results" : "talk",
          voteTags: Object.fromEntries((s.results.find((r) => r.id === s.activeResultId)?.computed.thinkerVotes ?? []).map((v) => [v.thinkerId, v.vote])),
        },
      };
    case "set_facts":
      return { ...state, session: { ...s, facts: mergeFacts([], action.facts) } };
    case "add_message":
      return { ...state, session: { ...s, messages: [...s.messages, action.message] } };
    case "set_seats":
      return { ...state, session: { ...s, seats: action.seats } };
    case "begin_vote":
      return {
        ...state,
        error: undefined,
        session: {
          ...s,
          oneOnOne: undefined,
          // Mark the moment in the transcript so the debate and poll read in order.
          messages: [
            ...s.messages,
            {
              id: uid(),
              kind: "moderator",
              status: "done",
              text: action.trigger === "rerun" ? `Re-running the ${FRAMEWORK_NAMES[action.framework]} with the new fact.` : `The vote is called: ${FRAMEWORK_NAMES[action.framework]}.`,
            },
          ],
          mode: "decide",
          voteTags: {},
          vote: {
            resultId: action.resultId,
            framework: action.framework,
            phase: "setup",
            trigger: action.trigger,
            whatIf: action.whatIf,
            scores: {},
            abstained: [],
            changed: [],
          },
        },
      };
    case "event":
      return applyEvent(state, s, action.event);
    default:
      return state;
  }
}

function applyEvent(state: State, s: Session, e: ServerEvent): State {
  switch (e.type) {
    case "plan":
      return {
        ...state,
        session: {
          ...s,
          decisionDetected: s.decisionDetected || e.decisionDetected,
          suggestedFramework: e.decisionDetected ? e.suggestedFramework : s.suggestedFramework,
        },
      };
    case "speaker_start":
      return {
        ...state,
        session: {
          ...s,
          messages: [
            ...s.messages,
            {
              id: e.messageId,
              kind: "thinker",
              speakerId: e.speakerId,
              text: "",
              status: "streaming",
              resultId: e.resultId,
              voteTag: e.resultId ? s.voteTags[e.speakerId] : undefined,
              oneOnOne: e.oneOnOne ? e.speakerId : undefined,
              replyTo: e.replyTo,
            },
          ],
        },
      };
    case "delta":
      return { ...state, session: updateMessage(s, e.messageId, (m) => ({ ...m, text: stripDashes(m.text + e.text) })) };
    case "speaker_end":
      return { ...state, session: updateMessage(s, e.messageId, (m) => ({ ...m, status: "done" })) };
    case "speaker_error":
      return { ...state, session: updateMessage(s, e.messageId, (m) => ({ ...m, status: "failed" })) };
    case "focus":
      return { ...state, session: { ...s, messages: [...s.messages, { id: uid(), kind: "moderator", text: e.text, status: "done" }] } };
    case "facts":
      return { ...state, session: { ...s, facts: mergeFacts(s.facts ?? [], e.facts) } };
    case "socrates_used":
      return { ...state, session: { ...s, socratesUsed: true } };
    case "notice":
      return { ...state, notice: e.text };
    case "error":
      return { ...state, error: { code: e.code, message: e.message } };
    case "done":
      return state;
    default:
      return applyVoteEvent(state, s, e);
  }
}

function applyVoteEvent(state: State, s: Session, e: ServerEvent): State {
  const v = s.vote;
  if (e.type === "result") {
    const results = [...s.results.filter((r) => r.id !== e.result.id), e.result];
    // The verdict card lands in the conversation, right after the poll.
    const card = { id: `result-${e.result.id}`, kind: "result" as const, text: "", status: "done" as const, resultId: e.result.id };
    return {
      ...state,
      session: {
        ...s,
        messages: [...s.messages.filter((m) => m.id !== card.id), card],
        results,
        activeResultId: e.result.id,
        mode: "results",
        vote: undefined,
        voteTags: Object.fromEntries(e.result.computed.thinkerVotes.map((x) => [x.thinkerId, x.vote])),
      },
    };
  }
  if (!v) return state;
  switch (e.type) {
    case "phase":
      return { ...state, session: { ...s, vote: { ...v, phase: e.phase } } };
    case "setup":
      return { ...state, session: { ...s, vote: { ...v, setup: e.setup } } };
    case "score":
      return {
        ...state,
        session: {
          ...s,
          voteTags: { ...s.voteTags, [e.score.thinkerId]: e.voteTag },
          vote: { ...v, scores: { ...v.scores, [e.score.thinkerId]: e.score } },
        },
      };
    case "abstain":
      return {
        ...state,
        session: {
          ...s,
          voteTags: { ...s.voteTags, [e.thinkerId]: "ABSTAIN" },
          vote: { ...v, abstained: [...v.abstained, e.thinkerId] },
        },
      };
    case "score_changed": {
      // Flag the thinker's latest debate bubble in this vote as "changed their vote".
      const moved = e.changes.length > 0;
      const lastIdx = moved ? s.messages.findLastIndex((m) => m.resultId === v.resultId && m.speakerId === e.thinkerId) : -1;
      const messages =
        lastIdx >= 0
          ? s.messages.map((m, i) => (i === lastIdx ? { ...m, changedVote: true, voteTag: e.voteTag } : m))
          : s.messages;
      return {
        ...state,
        session: {
          ...s,
          messages,
          voteTags: { ...s.voteTags, [e.thinkerId]: e.voteTag },
          vote: { ...v, scores: { ...v.scores, [e.thinkerId]: e.score }, changed: moved ? [...new Set([...v.changed, e.thinkerId])] : v.changed },
        },
      };
    }
    case "poll_line":
      return {
        ...state,
        session: {
          ...s,
          messages: [
            ...s.messages,
            {
              id: e.messageId,
              kind: "poll",
              speakerId: e.thinkerId,
              text: e.text,
              status: "done",
              voteTag: e.voteTag,
              resultId: e.resultId,
              changedVote: v.changed.includes(e.thinkerId),
            },
          ],
          voteTags: { ...s.voteTags, [e.thinkerId]: e.voteTag },
        },
      };
    default:
      return state;
  }
}

/** The transcript as the server needs it (drops empty/failed bubbles). */
export function toTranscript(s: Session) {
  return s.messages
    .filter((m) => m.status !== "failed" || m.text)
    .filter((m) => m.text.trim())
    .map((m) => ({ kind: m.kind, speakerId: m.speakerId, text: m.text, oneOnOne: m.oneOnOne }));
}

export function sessionBrief(s: Session) {
  return {
    roomId: s.roomId,
    seats: s.seats,
    question: s.question,
    socratesEnabled: s.socratesEnabled,
    socratesUsed: s.socratesUsed,
    facts: s.facts ?? [],
  };
}

/**
 * Adds new facts, skipping ones already known, keeping at most 12. Two facts are the same if
 * they match ignoring case, or carry the same numbers ("rent is €900 a month" / "rent: €900/month").
 */
export function mergeFacts(known: string[], incoming: string[]): string[] {
  const numbers = (f: string) => (f.match(/\d[\d,.]*/g) ?? []).map((n) => n.replace(/[,.]/g, "")).sort().join(" ");
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase() || (numbers(a) !== "" && numbers(a) === numbers(b));
  const out = [...known];
  for (const f of incoming.map((x) => x.trim()).filter(Boolean)) {
    if (!out.some((k) => same(k, f))) out.push(f);
  }
  return out.slice(0, 12);
}
