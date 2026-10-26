import { z } from "zod";
import { describeError, hasKey } from "@/lib/llm";
import { gateAdapter } from "@/lib/pipeline/gate";
import { matrixAdapter } from "@/lib/pipeline/matrix";
import { premortemAdapter } from "@/lib/pipeline/premortem";
import { runVote } from "@/lib/pipeline/runVote";
import type { FrameworkAdapter } from "@/lib/pipeline/types";
import { sessionBriefSchema, transcriptEntrySchema } from "@/lib/schemas";
import { createEventStream } from "@/lib/sse";
import type { FrameworkId, MatrixSetup, VoteResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADAPTERS: Partial<Record<FrameworkId, FrameworkAdapter>> = {
  gate: gateAdapter as unknown as FrameworkAdapter,
  matrix: matrixAdapter as unknown as FrameworkAdapter,
  premortem: premortemAdapter as unknown as FrameworkAdapter,
};

const voteRequestSchema = z.object({
  session: sessionBriefSchema,
  transcript: z.array(transcriptEntrySchema).max(400),
  framework: z.enum(["gate", "matrix", "premortem"]),
  resultId: z.string().min(1).max(64),
  whatIf: z.string().trim().max(1000).optional(),
  // Client-held objects, trusted only as context for prompts; shapes are checked loosely.
  matrixSetup: z.custom<MatrixSetup>((v) => typeof v === "object" && v !== null).optional(),
  previous: z.custom<VoteResult>((v) => typeof v === "object" && v !== null).optional(),
});

export async function POST(req: Request) {
  const parsed = voteRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ message: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const body = parsed.data;
  const adapter = ADAPTERS[body.framework];
  if (!adapter) return Response.json({ message: `The ${body.framework} framework isn't available yet.` }, { status: 400 });

  const out = createEventStream();
  (async () => {
    try {
      if (!hasKey()) {
        out.send({ type: "error", code: "no_key", message: "No API key is configured on the server (OPENAI_API_KEY or ANTHROPIC_API_KEY)." });
        return;
      }
      await runVote(adapter, {
        session: body.session,
        transcript: body.transcript,
        resultId: body.resultId,
        send: out.send,
        signal: req.signal,
        whatIf: body.whatIf,
        previous: body.previous,
        matrixSetup: body.matrixSetup,
      });
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
