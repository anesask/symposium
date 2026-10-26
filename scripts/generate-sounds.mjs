// Generates the fire ambience and the sound effects with the ElevenLabs Sound Effects API
// into /public/sounds/{name}.mp3. The audio engine uses them when present, and falls back to
// its synthesised sounds when they're not.
// Usage: node --env-file=.env.local scripts/generate-sounds.mjs [name ...]
import { mkdir, readdir, writeFile } from "node:fs/promises";

const SOUNDS = {
  fire: {
    text: "A lively wood fire burning in a stone hearth, recorded up close: frequent sharp crackles, loud pops and snaps of dry olive wood, a steady warm roar and hiss of embers. No wind, no music, no voices. Seamless loop.",
    duration: 22,
    loop: true,
  },
  seat: { text: "A clear, loud, bright pluck of a single harp string, close microphone, ringing for a second.", duration: 1.5 },
  unseat: { text: "A single soft, low, slightly muted pluck of a lyre string. Short and gentle.", duration: 1 },
  gong: { text: "A small bronze gong struck once in a stone hall. Deep warm tone with a long shimmering decay.", duration: 5 },
  verdict: { text: "A short rising flourish on an ancient Greek lyre that ends on a bright, resolved chord. Warm and quietly triumphant.", duration: 3 },
  speak: { text: "A clear clink of a ceramic cup being set down on a wooden table, close microphone.", duration: 1 },
};

const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error("ELEVENLABS_API_KEY is not set in .env.local");
  process.exit(1);
}
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SOUNDS);
await mkdir("public/sounds", { recursive: true });

async function generate(name, s, withLoop) {
  const res = await fetch("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128", {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: s.text,
      duration_seconds: s.duration,
      prompt_influence: 0.6,
      model_id: "eleven_text_to_sound_v2",
      ...(withLoop && s.loop ? { loop: true } : {}),
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

for (const name of names) {
  const s = SOUNDS[name];
  if (!s) throw new Error(`Unknown sound: ${name}`);
  let audio;
  try {
    audio = await generate(name, s, true);
  } catch (e) {
    // Older accounts or models may not accept the loop flag: try once without it.
    if (!s.loop) throw e;
    console.log(`${name}: retrying without loop (${e.message})`);
    audio = await generate(name, s, false);
  }
  await writeFile(`public/sounds/${name}.mp3`, audio);
  console.log(`${name}: done (${Math.round(audio.length / 1024)} KB)`);
}

// Tell the app which recordings exist.
const files = (await readdir("public/sounds")).filter((f) => f.endsWith(".mp3")).map((f) => f.slice(0, -4));
await writeFile("public/sounds/manifest.json", JSON.stringify({ sounds: files }, null, 2) + "\n");
console.log("manifest:", files.join(", "));
