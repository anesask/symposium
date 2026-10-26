// Generates the thinker portraits with the OpenAI Images API into /public/portraits/{id}.webp.
// Usage: node --env-file=.env.local scripts/generate-portraits.mjs [id ...]
// With no ids it generates all ten. Then set PORTRAIT_FORMAT = "webp" in config/art.ts.
import { writeFile } from "node:fs/promises";
import OpenAI from "openai";

const STYLE = `Painterly oil portrait in a consistent series of ancient Greek philosophers. Head and shoulders,
centred, three-quarter view, looking slightly toward the viewer. Dramatic warm candlelight from the left,
deep chiaroscuro, rich visible brushwork. Background: dark warm charcoal with a soft terracotta glow behind the head,
a faint hint of a black-figure Greek vase pattern. Muted palette of umber, terracotta, ochre and cream.
Square composition with the face filling the upper middle third. No text, no letters, no frame, no border.`;

const PEOPLE = {
  aristotle: "Aristotle: a man in his fifties, neatly trimmed short dark beard going grey, short hair, calm analytical gaze, fine cream himation with a dark border, one hand raised as if making a precise point.",
  plato: "Plato: a broad-shouldered man in his sixties, full wavy grey beard, high forehead, dreamy upward gaze, pale blue-grey himation, soft light falling on his face as if from a cave mouth.",
  socrates: "Socrates: an old man, balding, snub nose, wide face, bushy white beard, mischievous knowing half-smile, plain rough wool cloak, eyebrows raised as if asking a question.",
  diogenes: "Diogenes the Cynic: a weathered old man with a wild unkempt grey beard and tangled hair, sunburnt skin, torn ragged brown cloak, holding a small oil lantern, amused contemptuous grin.",
  epicurus: "Epicurus: a gentle man in his forties, soft curly brown beard, kind relaxed eyes, olive-green tunic, a sprig of olive leaves and a cup of water near him, garden greenery softly in the dark background.",
  heraclitus: "Heraclitus: a gaunt intense man in his forties, dark unruly hair and beard, piercing brooding eyes, dark rust-red cloak, flickering firelight reflected on his face, embers floating in the dark.",
  pythagoras: "Pythagoras: a solemn man in his sixties, long white beard, white headband, white robe, gold-leaf accents, faint glowing geometric triangle and circle lines in the background.",
  epictetus: "Epictetus: a lean stern man in his fifties, short grey beard, plain dark-red tunic, a simple walking staff, steady unflinching gaze, quiet dignity.",
  hypatia: "Hypatia of Alexandria: a woman in her forties, dark hair bound up, intelligent calm gaze, deep blue palla over a cream chiton, holding a brass astrolabe, faint stars in the dark background.",
  thucydides: "Thucydides: a lean Athenian general in his fifties, short dark beard, bronze Corinthian helmet pushed up on his head, steel-blue cloak, a scroll under his arm, dry sceptical expression.",
};

const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(PEOPLE);
const models = [process.env.OPENAI_IMAGE_MODEL, "gpt-image-1.5", "gpt-image-1"].filter(Boolean);
const client = new OpenAI();

for (const id of ids) {
  if (!PEOPLE[id]) throw new Error(`Unknown id: ${id}`);
  let lastError;
  for (const model of models) {
    try {
      const res = await client.images.generate({
        model,
        prompt: `${STYLE}\n\nSubject: ${PEOPLE[id]}`,
        size: "1024x1024",
        quality: "medium",
        output_format: "webp",
        output_compression: 82,
      });
      await writeFile(`public/portraits/${id}.webp`, Buffer.from(res.data[0].b64_json, "base64"));
      console.log(`${id}: done (${model})`);
      lastError = null;
      break;
    } catch (e) {
      lastError = e;
      console.log(`${id}: ${model} failed: ${e.status ?? ""} ${e.message?.slice(0, 160)}`);
    }
  }
  if (lastError) process.exitCode = 1;
}
