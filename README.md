# Symposium

**Argue it out with the greats.** Bring a modern question to a table of ancient Greek philosophers. They argue it out in character, then you call the vote and get a verdict with the conditions to meet.

In 1985 Steve Jobs imagined a student who could ask Aristotle a question and get an answer. Today a single AI gives one careful, polite answer to a hard decision. Symposium seats you at a table of philosophers who **disagree with each other**, and ends the argument with a **real decision method** whose verdict is **computed in code**, never asserted by the model.

## Try it

Requirements: Node.js 20+ and an OpenAI API key (or an Anthropic key, see Configuration).

```bash
npm install
cp .env.example .env.local   # then put your key in .env.local
npm run dev
```

Open **http://localhost:3000**, take a seat, choose three to five philosophers and ask your question.

**No key?** Open **http://localhost:3000/?demo=1** (or "Watch a sample debate" on the landing page): a scripted session ("Should I use AI to write my work emails, or is that cheating?") plays through the same UI with no network calls. Its verdicts are still computed by the real gate code.

## What it does

1. **Choose your table.** A character-select screen with nine thinkers (Aristotle, Plato, Diogenes, Epicurus, Heraclitus, Pythagoras, Epictetus, Hypatia, Thucydides): click or drag up to five into the seats. Socrates can join as a special guest who asks exactly one question. As you type your question, it suggests who would suit it.
2. **Ask.** Type anything, pick an example, or start from **today's news**: personal questions drawn from current headlines (BBC and Guardian RSS feeds).
3. **Let them argue.** Each turn a moderator picks a sharp focus, two thinkers answer and one rebuts. Replies are written out by quill on papyrus; the one being answered lights up on the table. `@Name` (or a click on a portrait) asks someone directly, or talk to one of them **privately** (1:1). The moderator picks up the facts you state ("€5,000 saved") and every thinker and vote uses them; you can edit them. **Sum up** writes where they agree, where they disagree and what's still unknown.
4. **Call the vote.** Three methods, one shared pipeline (score in parallel, debate, re-score, poll out loud, compute):
   - **Should I?** (Go / No-Go gate): five stations × 3 criteria. A "no" on a must-have means **Not yet**; at least 60% clear yes means **Yes**; otherwise **Yes, if…** with the conditions.
   - **Which one?** (decision matrix): 2 to 4 options × weighted criteria, contested cells flagged, and the one change that would flip the ranking.
   - **What could go wrong?** (pre-mortem): the top five ways it fails, ranked by likelihood × damage, each with a fix: **Go ahead**, **Rethink first** or **Stop**.
5. **The verdict** is written on a papyrus scroll in plain words with the Greek beneath, sealed, with every thinker's vote and "How this was decided" in plain sentences. Copy it as text, save it as an image, or have a herald read it aloud. **What if…?** changes one fact and votes again, showing what changed.

Each thinker has a fixed lean (Pythagoras wants the numbers to balance, Heraclitus bets on change, Diogenes votes against anything done for status), so the table genuinely splits instead of agreeing politely.

Also: **The philosophers** (`/philosophers`), a plain-words guide to each thinker; **Settings** for writing speed, voice, background music, a crackling fire and sound effects; one button in the top bar to turn all sound off.

## Configuration

All settings live in `.env.local` (see `.env.example`):

| Variable | Purpose |
|---|---|
| `AI_PROVIDER` | `openai` (default) or `anthropic` |
| `OPENAI_API_KEY` | OpenAI key (default provider) |
| `OPENAI_MODEL_FAST` / `OPENAI_MODEL_SPEECH` | Models for structured calls / speeches (default `gpt-5.4-mini` / `gpt-5.5`) |
| `ANTHROPIC_API_KEY` | Anthropic key, when `AI_PROVIDER=anthropic` |
| `ANTHROPIC_MODEL_FAST` / `ANTHROPIC_MODEL_SPEECH` | Defaults `claude-haiku-5-5` / `claude-sonnet-5-5` |
| `TTS_PROVIDER` | `browser` (default, free) or `elevenlabs` for the herald's voice |
| `ELEVENLABS_API_KEY` | Only for `TTS_PROVIDER=elevenlabs` |

Keys stay on the server: the browser only talks to this app's own `/api/*` routes.

## Art and sound

Everything was generated for this project:

- **Portraits, scenery and logo:** OpenAI Images (`gpt-image-1.5`) via `scripts/generate-portraits.mjs` and `scripts/generate-scenes.mjs`.
- **Music, fire and sound effects:** ElevenLabs (Music and Sound Effects) via `scripts/generate-music.mjs` and `scripts/generate-sounds.mjs`.

Without the generated sound files, `lib/audio/engine.ts` synthesises stand-ins with Web Audio. Placeholder SVG portraits (`scripts/make-portraits.mjs`) work too: set `PORTRAIT_FORMAT = "svg"` in `config/art.ts`.

## Privacy

- Your question and the conversation go to the configured AI provider (OpenAI by default, or Anthropic) to generate replies and votes.
- If the herald voice is enabled, the verdict text goes to ElevenLabs.
- For "today's news", the server reads public RSS feeds and sends only their headlines to the AI provider.
- The microphone button uses the browser's speech recognition (in Chrome, Google processes that audio).
- The current debate and your settings stay in your browser's `localStorage`. No accounts, no cookies, no analytics.

## Project structure

```
app/                 pages (landing + table, /philosophers) and API routes (talk, vote, summary, topics, tts, config)
components/          table, feed, composer, onboarding, vote sheet, verdict scroll, settings
config/              roster, rooms, gate criteria, example questions, the philosophers guide, art slots
lib/llm/             provider layer: OpenAI (default) and Anthropic
lib/pipeline/        the shared vote pipeline + one adapter per framework
lib/frameworks/      pure verdict math (gate, matrix, pre-mortem, diff), unit-tested
lib/store/           session state (reducer + localStorage) and the pen-and-papyrus pacer
lib/audio/           music, fire and effects (recorded or synthesised)
lib/demo/            the scripted demo session (sample data) and its player
lib/voice/           the herald (verdict read aloud) and speech input
scripts/             art and sound generators
tests/               Vitest tests for the verdict math, the demo and helpers
devpost/             planning docs: scope, PRD, spec, build checklist, open points
```

## Scripts

```bash
npm run dev        # dev server on :3000
npm run build      # production build
npm start          # serve the build
npm test           # tests (Vitest)
npm run typecheck  # TypeScript
```

## Notes

- Symposium is a thinking aid, **not** financial, legal or medical advice.
- The philosophers are AI interpretations in each thinker's style, not quotations. The portraits are AI paintings, not historical likenesses.
- Built for **Build With AI: Basics** (Devpost) with Claude Code and the Devpost Learn Skill Pack: planned first (`devpost/scope.md`, `prd.md`, `spec.md`), then built slice by slice (`devpost/checklist.md`). `devpost/open-points.md` lists what I'd improve next.

## License

[MIT](LICENSE)
