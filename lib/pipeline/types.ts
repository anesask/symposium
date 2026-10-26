import type { createEventStream } from "@/lib/sse";
import type {
  Computed,
  FrameworkId,
  FrameworkSetup,
  MatrixSetup,
  PremortemCause,
  SessionBrief,
  ThinkerId,
  ThinkerScore,
  TranscriptEntry,
  VoteChange,
  VoteResult,
  VoteTag,
} from "@/lib/types";

export interface VoteContext {
  session: SessionBrief;
  transcript: TranscriptEntry[];
  resultId: string;
  send: ReturnType<typeof createEventStream>["send"];
  signal: AbortSignal;
  whatIf?: string;
  previous?: VoteResult;
  matrixSetup?: MatrixSetup;
}

export interface DebatePlan {
  /** What the table is arguing about, in one or two sentences for the speakers' prompt. */
  focus: string;
  /** 2-3 speakers in order. */
  speakers: ThinkerId[];
}

/** Everything that differs between the three frameworks. The pipeline is shared. */
export interface FrameworkAdapter<S extends FrameworkSetup = FrameworkSetup, T extends ThinkerScore = ThinkerScore> {
  framework: FrameworkId;
  setup(ctx: VoteContext): Promise<S>;
  /** First-pass scoring by one thinker (structured call). Throws on failure. */
  score(ctx: VoteContext, setup: S, thinkerId: ThinkerId): Promise<T>;
  voteTag(setup: S, score: T, all: T[]): VoteTag;
  /** Human-readable summary of everyone's scores, fed to debate and poll prompts. */
  summarize(setup: S, scores: T[]): string;
  debate(setup: S, scores: T[]): DebatePlan;
  /** After the debate: the thinker's revised score (structured call). */
  revise(ctx: VoteContext, setup: S, score: T, all: T[], debate: TranscriptEntry[]): Promise<{ score: T; because: string }>;
  /** Differences between two scores from the same thinker, for "what changed minds". */
  diff(setup: S, before: T, after: T, because: string): VoteChange[];
  compute(setup: S, scores: T[], abstained: ThinkerId[]): Computed;
  /** Framework-specific instruction for the out-loud poll line. */
  pollInstruction: string;
  /** Premortem: the collected causes, stored on the result. */
  causes?(scores: T[]): PremortemCause[];
}
