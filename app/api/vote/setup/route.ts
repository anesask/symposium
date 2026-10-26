import { z } from "zod";
import { describeError, hasKey, StructuredError } from "@/lib/llm";
import { proposeMatrixSetup } from "@/lib/pipeline/matrix";
import { sessionBriefSchema, transcriptEntrySchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ session: sessionBriefSchema, transcript: z.array(transcriptEntrySchema).max(400) });

/** Proposes matrix options + weighted criteria for the user to edit before the vote. */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  if (!hasKey()) return Response.json({ message: "No API key is configured on the server (OPENAI_API_KEY or ANTHROPIC_API_KEY)." }, { status: 503 });
  try {
    for (let i = 0; i < 2; i++) {
      try {
        return Response.json(await proposeMatrixSetup(parsed.data.session, parsed.data.transcript));
      } catch (err) {
        if (!(err instanceof StructuredError) || i === 1) throw err;
      }
    }
  } catch (err) {
    return Response.json({ message: describeError(err).message }, { status: 502 });
  }
}
