import { z } from "zod";
import { ROSTER } from "@/config/roster";
import { thinkerIdSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A stock ElevenLabs voice for the moderator's poll calls.
const MODERATOR_VOICE = "JBFqnCBsd6RMkjVDRZzb";
const MODEL = process.env.ELEVENLABS_MODEL || "eleven_flash_v2_5";

const schema = z.object({
  text: z.string().trim().min(1).max(1200),
  speakerId: z.union([thinkerIdSchema, z.literal("moderator")]),
});

/** ElevenLabs proxy, so the key stays on the server. Only active with TTS_PROVIDER=elevenlabs. */
export async function POST(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (process.env.TTS_PROVIDER !== "elevenlabs" || !key) {
    return Response.json({ message: "ElevenLabs isn't configured (TTS_PROVIDER=elevenlabs and ELEVENLABS_API_KEY)." }, { status: 501 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Invalid request." }, { status: 400 });
  const { text, speakerId } = parsed.data;
  const voiceId = speakerId === "moderator" ? MODERATOR_VOICE : ROSTER[speakerId].voice.elevenlabs;

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: MODEL }),
  });
  if (!res.ok || !res.body) {
    return Response.json({ message: `ElevenLabs error (${res.status}).` }, { status: 502 });
  }
  return new Response(res.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400" } });
}
