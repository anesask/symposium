// Shared types for client, server and demo script. Zod schemas live in lib/schemas.ts.

export const THINKER_IDS = [
  "aristotle",
  "plato",
  "socrates",
  "diogenes",
  "epicurus",
  "heraclitus",
  "pythagoras",
  "epictetus",
  "hypatia",
  "thucydides",
] as const;
export type ThinkerId = (typeof THINKER_IDS)[number];

export const STATIONS = ["finance", "risk", "market", "personal", "longterm"] as const;
export type Station = (typeof STATIONS)[number];

export type RoomId = "boardroom";
export type FrameworkId = "gate" | "matrix" | "premortem";
export type Mode = "talk" | "decide" | "results";

export interface Thinker {
  id: ThinkerId;
  name: string;
  /** Short form used by the moderator in the poll ("Pythagoras?"). */
  shortName: string;
  archetype: string;
  /** Station they own in the Go/No-Go gate. Null = no home station (they cover one); Socrates never votes. */
  station: Station | null;
  stationLabel: string;
  accentColor: string;
  /** Character-select stats, 1 to 5. */
  stats: { boldness: number; rigor: number; heart: number };
  /** Signature move shown on the character-select screen. */
  move: { name: string; line: string };
  voice: {
    browser: { pitch: number; rate: number; prefer: "male" | "female" };
    elevenlabs: string;
  };
  /** Voice and rules for this thinker. */
  persona: string;
  /**
   * How this thinker tends to vote. Every thinker runs on the same model, so without a fixed
   * lean the table drifts to the same cautious answer; this keeps the disagreement real.
   */
  lean: string;
}

export interface Room {
  id: RoomId;
  name: string;
  tagline: string;
  defaultSeats: ThinkerId[];
  opening: string;
  examples: string[];
}

// ---------- Transcript ----------

/** "result" is a verdict card placed in the conversation (no text; resultId points at the result). */
export type MessageKind = "user" | "thinker" | "moderator" | "fact" | "poll" | "notice" | "result";
export type VoteTag = "GO" | "NO-GO" | "GO, IF" | "ABSTAIN" | string;

export interface Message {
  id: string;
  kind: MessageKind;
  speakerId?: ThinkerId;
  text: string;
  status: "streaming" | "done" | "failed";
  /** Shown on the right of a bubble in Decide/Results. */
  voteTag?: VoteTag;
  changedVote?: boolean;
  /** Said in a private 1:1 with this thinker (the rest of the table only overheard). */
  oneOnOne?: ThinkerId;
  /** Which vote run this message belongs to (debate turns, poll lines). */
  resultId?: string;
  /** A rebuttal: the thinker being answered. */
  replyTo?: ThinkerId;
  /** A "Sum up" card from the moderator. */
  summary?: TableSummary;
}

/** What the server needs from a transcript entry. */
export interface TranscriptEntry {
  kind: MessageKind;
  speakerId?: ThinkerId;
  text: string;
  oneOnOne?: ThinkerId;
}

export interface SessionBrief {
  roomId: RoomId;
  seats: ThinkerId[];
  question: string;
  socratesEnabled: boolean;
  socratesUsed: boolean;
  /** Concrete facts the user has stated (savings, rent, timeline); every prompt uses them. */
  facts?: string[];
}

/** "Sum up": where the table stands. */
export interface TableSummary {
  agree: string[];
  disagree: string[];
  unknown: string[];
}

// ---------- Go / No-Go gate ----------

export type GateVote = "GO" | "NO-GO" | "CONDITIONAL";

export interface GateCriterion {
  id: string;
  label: string;
  mustPass: boolean;
}

export interface GateStationSetup {
  station: Station;
  ownerId: ThinkerId;
  covering: boolean;
  criteria: GateCriterion[];
}

export interface GateSetup {
  framework: "gate";
  stations: GateStationSetup[];
}

export interface GateCriterionVote {
  criterionId: string;
  vote: GateVote;
  reason: string;
  /** For NO-GO / CONDITIONAL: the action and measurable check that would make it GO. */
  condition?: string;
}

export interface GateThinkerScore {
  framework: "gate";
  thinkerId: ThinkerId;
  stations: { station: Station; votes: GateCriterionVote[] }[];
}

export type GateVerdict = "GO" | "NO-GO" | "GO, IF";

export interface GateComputed {
  framework: "gate";
  /** The rule applied, step by step, in plain words (shown as "How this was decided"). */
  trace: string[];
  verdict: GateVerdict;
  tally: { for: number; against: number; abstained: number };
  thinkerVotes: { thinkerId: ThinkerId; vote: VoteTag }[];
  goShare: number;
  flipCondition?: string;
  conditions: string[];
  openRisks: string[];
  scorecard: {
    station: Station;
    ownerId: ThinkerId;
    covering: boolean;
    status: GateVote | "ABSTAIN";
    criteria: (GateCriterion & { vote: GateVote | "ABSTAIN"; reason: string; condition?: string })[];
  }[];
}

// ---------- Decision matrix ----------

export interface MatrixOption {
  id: string;
  label: string;
}
export interface MatrixCriterion {
  id: string;
  label: string;
  weight: number;
}
export interface MatrixSetup {
  framework: "matrix";
  options: MatrixOption[];
  criteria: MatrixCriterion[];
}
export interface MatrixCell {
  optionId: string;
  criterionId: string;
  score: number;
  reason: string;
}
export interface MatrixThinkerScore {
  framework: "matrix";
  thinkerId: ThinkerId;
  cells: MatrixCell[];
}
export interface MatrixComputed {
  framework: "matrix";
  trace: string[];
  ranking: { optionId: string; label: string; total: number; percent: number }[];
  cells: { optionId: string; criterionId: string; avg: number; spread: number; contested: boolean }[];
  decisiveCriterionId: string | null;
  sensitivity: string;
  thinkerVotes: { thinkerId: ThinkerId; vote: VoteTag }[];
  tally: { for: number; against: number; abstained: number };
}

// ---------- Pre-mortem ----------

export interface PremortemSetup {
  framework: "premortem";
  premise: string;
  plan: string;
}
export interface PremortemCause {
  id: string;
  thinkerId: ThinkerId;
  cause: string;
  warningSign: string;
  mitigation: string;
}
export interface PremortemThinkerScore {
  framework: "premortem";
  thinkerId: ThinkerId;
  /** First pass: the thinker's own cause. */
  cause?: { cause: string; warningSign: string; mitigation: string };
  /** After the debate: ratings of every cause on the table. */
  ratings?: { causeId: string; likelihood: number; damage: number; mitigationCredible: number }[];
}
export type PremortemCall = "proceed" | "revise" | "stop";
export interface PremortemComputed {
  framework: "premortem";
  trace: string[];
  ranked: (PremortemCause & {
    likelihood: number;
    damage: number;
    risk: number;
    mitigationCredible: number;
    critical: boolean;
  })[];
  call: PremortemCall;
  warningChecklist: string[];
  thinkerVotes: { thinkerId: ThinkerId; vote: VoteTag }[];
  tally: { for: number; against: number; abstained: number };
}

// ---------- Vote results ----------

export type FrameworkSetup = GateSetup | MatrixSetup | PremortemSetup;
export type ThinkerScore = GateThinkerScore | MatrixThinkerScore | PremortemThinkerScore;
export type Computed = GateComputed | MatrixComputed | PremortemComputed;

export interface VoteChange {
  thinkerId: ThinkerId;
  what: string;
  from: string;
  to: string;
  because: string;
}

export interface PollLine {
  thinkerId: ThinkerId;
  line: string;
}

export interface VoteResult {
  id: string;
  framework: FrameworkId;
  createdAt: number;
  trigger: "vote" | "rerun";
  whatIf?: string;
  setup: FrameworkSetup;
  scores: ThinkerScore[];
  abstained: ThinkerId[];
  changes: VoteChange[];
  pollLines: PollLine[];
  computed: Computed;
  previousResultId?: string;
  /** Premortem only: causes as collected (ids referenced by ratings). */
  causes?: PremortemCause[];
}

// ---------- Server events (SSE) ----------

export type VotePhase = "setup" | "scores" | "debate" | "poll" | "result";

export type ServerEvent =
  | {
      type: "plan";
      speakers: ThinkerId[];
      decisionDetected: boolean;
      suggestedFramework: FrameworkId;
    }
  | { type: "speaker_start"; messageId: string; speakerId: ThinkerId; resultId?: string; oneOnOne?: boolean; replyTo?: ThinkerId }
  | { type: "facts"; facts: string[] }
  | { type: "delta"; messageId: string; text: string }
  | { type: "speaker_end"; messageId: string }
  | { type: "speaker_error"; messageId: string; error: string }
  | { type: "socrates_used" }
  /** The moderator's sharp question for this turn, shown in the conversation. */
  | { type: "focus"; text: string }
  | { type: "notice"; text: string }
  | { type: "phase"; resultId: string; phase: VotePhase; framework: FrameworkId }
  | { type: "setup"; resultId: string; setup: FrameworkSetup }
  | { type: "score"; resultId: string; score: ThinkerScore; voteTag: VoteTag }
  | { type: "abstain"; resultId: string; thinkerId: ThinkerId }
  | { type: "score_changed"; resultId: string; thinkerId: ThinkerId; score: ThinkerScore; voteTag: VoteTag; changes: VoteChange[] }
  | { type: "poll_line"; resultId: string; messageId: string; thinkerId: ThinkerId; text: string; voteTag: VoteTag }
  | { type: "result"; result: VoteResult }
  | { type: "error"; code: "no_key" | "rate_limited" | "failed" | "bad_request"; message: string }
  | { type: "done" };
