// Generates the background music with ElevenLabs into /public/sounds/music.mp3, and adds it to
// the manifest. Tries the Music API first, then falls back to a looping clip from the Sound
// Effects API (30 seconds) if the account can't use Music.
// Usage: node --env-file=.env.local scripts/generate-music.mjs
import { readFile, writeFile } from "node:fs/promises";

const PROMPT =
  "Calm instrumental music for an ancient Greek dinner party at night: a solo lyre (kithara) playing a slow, gentle melody in the Dorian mode, a soft low drone, a hint of an aulos flute far away. Warm, intimate, unhurried, no percussion, no vocals. Suitable as quiet background music for reading and conversation, seamless loop.";

const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error("ELEVENLABS_API_KEY is not set in .env.local");
  process.exit(1);
}
const headers = { "xi-api-key": key, "Content-Type": "application/json" };

async function viaMusic() {
  const res = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", {
    method: "POST",
    headers,
    body: JSON.stringify({ prompt: PROMPT, music_length_ms: 90000, force_instrumental: true }),
  });
  if (!res.ok) throw new Error(`music ${res.status} ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function viaSoundEffects() {
  const res = await fetch("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128", {
    method: "POST",
    headers,
    body: JSON.stringify({ text: PROMPT, duration_seconds: 30, prompt_influence: 0.5, model_id: "eleven_text_to_sound_v2", loop: true }),
  });
  if (!res.ok) throw new Error(`sound-generation ${res.status} ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

let audio;
try {
  audio = await viaMusic();
  console.log("music: generated with the Music API");
} catch (e) {
  console.log(`music: Music API unavailable (${e.message}); using a sound-effects loop`);
  audio = await viaSoundEffects();
}
await writeFile("public/sounds/music.mp3", audio);
const manifest = JSON.parse(await readFile("public/sounds/manifest.json", "utf8"));
manifest.sounds = [...new Set([...manifest.sounds, "music"])];
await writeFile("public/sounds/manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(`music: done (${Math.round(audio.length / 1024)} KB)`);
