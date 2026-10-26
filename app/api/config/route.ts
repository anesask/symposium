import { hasKey } from "@/lib/llm";

export const dynamic = "force-dynamic";

/** What the client needs to know about server config. Never returns secrets. */
export function GET() {
  const tts = process.env.TTS_PROVIDER === "elevenlabs" && process.env.ELEVENLABS_API_KEY ? "elevenlabs" : "browser";
  return Response.json({ hasKey: hasKey(), ttsProvider: tts });
}
