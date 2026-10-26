// Generates the scenery with the OpenAI Images API into /public/scenes/.
// Usage: node --env-file=.env.local scripts/generate-scenes.mjs [name ...]
import { mkdir, writeFile } from "node:fs/promises";
import OpenAI from "openai";

const STYLE = `Painterly oil painting, same series as candlelit portraits of ancient Greek philosophers: warm oil-lamp light,
deep chiaroscuro, visible brushwork, palette of umber, terracotta, ochre, black and cream. No people, no text, no letters, no frame.`;

const SCENES = {
  hall: {
    size: "1536x1024",
    prompt: `The inside of an ancient Greek andron (the dining room of a symposium) at night. Dark painted walls with a faded
red-figure frieze, two fluted columns at the sides, bronze oil lamps glowing, couches with cushions in shadow around the edges,
the centre of the room open and dark (a round table will be placed there). Very dark overall, with light pooling in the middle.`,
  },
  stage: {
    size: "1536x1024",
    prompt: `A wide view of an ancient Greek temple portico at dusk, seen from the agora steps. Massive Doric columns in silhouette,
braziers burning on both sides, a deep ochre and terracotta sky fading to near black at the top. Dramatic, like the stage of a
character-select screen in a fighting game, but painted like a classical oil painting. Dark at the edges.`,
  },
  table: {
    size: "1024x1024",
    background: "transparent",
    prompt: `A perfectly round ancient Greek symposium table seen from directly above (top-down, orthographic), centred and filling
the frame, on a transparent background. Dark polished olive wood with a thin bronze rim inlaid with a Greek key (meander) pattern.
On it, kept near the centre and sparse: a black-figure kylix wine cup, a small bowl of olives, a torn loaf of bread, a rolled papyrus scroll
and a small clay oil lamp. The outer ring of the table is empty so portraits can sit on it.`,
  },
  logo: {
    size: "1024x1024",
    background: "transparent",
    plain: true,
    prompt: `A logo emblem for an app called Symposium, on a transparent background. A Greek kylix (a wide, shallow two-handled
wine cup on a short stem) seen from the side, drawn in the style of an Attic red-figure vase: terracotta-orange cup with crisp black
outlines and a thin black meander band, framed by a simple laurel wreath in the same terracotta. Flat, bold, symmetrical, centred,
readable at 32 pixels. No text, no letters, no background, no shadow.`,
  },
};

const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SCENES);
const client = new OpenAI();
await mkdir("public/scenes", { recursive: true });

await Promise.all(
  names.map(async (name) => {
    const s = SCENES[name];
    if (!s) throw new Error(`Unknown scene: ${name}`);
    const res = await client.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1.5",
      prompt: s.plain ? s.prompt : `${STYLE}

${s.prompt}`,
      size: s.size,
      quality: "medium",
      background: s.background ?? "opaque",
      output_format: "webp",
      output_compression: 80,
    });
    await writeFile(`public/scenes/${name}.webp`, Buffer.from(res.data[0].b64_json, "base64"));
    console.log(`${name}: done`);
  }),
);
