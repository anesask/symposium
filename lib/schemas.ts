import { z } from "zod";
import { THINKER_IDS } from "@/lib/types";

// ---------- Request bodies ----------

export const thinkerIdSchema = z.enum(THINKER_IDS);

export const sessionBriefSchema = z.object({
  roomId: z.literal("boardroom"),
  seats: z
    .array(thinkerIdSchema)
    .min(3, "A table needs at least 3 thinkers.")
    .max(5, "A table seats at most 5 thinkers.")
    .refine((s) => new Set(s).size === s.length, "Duplicate seats.")
    .refine((s) => !s.includes("socrates"), "Socrates never takes a seat."),
  question: z.string().trim().min(1).max(2000),
  facts: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
  socratesEnabled: z.boolean(),
  socratesUsed: z.boolean(),
});

export const transcriptEntrySchema = z.object({
  kind: z.enum(["user", "thinker", "moderator", "fact", "poll", "notice"]),
  speakerId: thinkerIdSchema.optional(),
  text: z.string().max(8000),
  oneOnOne: thinkerIdSchema.optional(),
});

export const talkRequestSchema = z.object({
  session: sessionBriefSchema,
  transcript: z.array(transcriptEntrySchema).max(400),
  tag: thinkerIdSchema.optional(),
  /** Private conversation with one seated thinker: only they answer, at more length. */
  oneOnOne: thinkerIdSchema.optional(),
  /** No new user message: the table keeps arguing ("Let them argue"). */
  continueDebate: z.boolean().optional(),
  /** Re-request a single speaker (Retry on a failed bubble). */
  only: thinkerIdSchema.optional(),
});
export type TalkRequest = z.infer<typeof talkRequestSchema>;

// ---------- Model outputs (kept simple: bounds are enforced in code, not in the JSON schema) ----------

export function moderatorSchema(seats: readonly string[]) {
  return z.object({
    focus: z.string(),
    speakers: z.array(z.enum(seats as [string, ...string[]])),
    rebuttals: z.array(z.object({ speaker: z.enum(seats as [string, ...string[]]), replyTo: z.enum(seats as [string, ...string[]]) })),
    facts: z.array(z.string()),
    decisionDetected: z.boolean(),
    suggestedFramework: z.enum(["gate", "matrix", "premortem"]),
  });
}

export const summaryRequestSchema = z.object({
  session: sessionBriefSchema,
  transcript: z.array(transcriptEntrySchema).max(400),
});

export const summarySchema = z.object({
  agree: z.array(z.string()),
  disagree: z.array(z.string()),
  unknown: z.array(z.string()),
  facts: z.array(z.string()),
});
