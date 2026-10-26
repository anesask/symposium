import { describeError, hasKey, structured } from "@/lib/llm";
import { formatTranscript, questionLine, tableDescription } from "@/lib/prompts/common";
import { summaryRequestSchema, summarySchema } from "@/lib/schemas";
import { stripDashesDeep } from "@/lib/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** "Sum up": where the table agrees, where it doesn't, what's still unknown, and the facts so far. */
export async function POST(req: Request) {
  const parsed = summaryRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Invalid request." }, { status: 400 });
  if (!hasKey()) return Response.json({ message: "No API key is configured on the server." }, { status: 503 });
  const { session, transcript } = parsed.data;
  try {
    const out = await structured(summarySchema, {
      system:
        "You are the moderator of Symposium, a table of ancient Greek philosophers helping one person with a modern question. Sum up the conversation for the user, plainly and specifically, using their own details. Each line is one short sentence (under 120 characters) and names who holds the view when it matters. No filler.",
      user: `${questionLine(session)}

The table:
${tableDescription(session)}

Conversation:
${formatTranscript(transcript)}

Write:
- agree: up to 3 points the table broadly agrees on
- disagree: up to 3 live disagreements, naming who is on which side
- unknown: up to 3 things nobody knows yet that would change the answer (as questions the user could answer)
- facts: concrete facts the user has stated (amounts, dates, people, constraints) that are NOT already listed under Known facts, each a short phrase under 60 characters; empty if there are none`,
      maxTokens: 900,
    });
    return Response.json(
      stripDashesDeep({
        agree: out.agree.slice(0, 3),
        disagree: out.disagree.slice(0, 3),
        unknown: out.unknown.slice(0, 3),
        facts: out.facts.map((f) => f.trim()).filter(Boolean).slice(0, 12),
      }),
    );
  } catch (err) {
    return Response.json({ message: describeError(err).message }, { status: 502 });
  }
}
