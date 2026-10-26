---
doc: spec
status: approved
---

# Symposium: Technical Spec

## How This Works, In Plain Language
Symposium is one Next.js web app that runs on your own laptop. It has two halves.

- **The browser side** (React) draws everything you see: the landing page, the seat select, the round table, the chat, the composer and the verdict scroll. It holds the whole session in memory and keeps a copy in `localStorage` (a small notebook the browser keeps for this site), so a refresh loses nothing.
- **The server side** (Next.js route handlers under `app/api/`) is the only part that talks to the AI. The API keys stay there and never reach the browser. Most routes answer with a stream of small **events** ("Plato starts speaking", "here are a few more words", "Hypatia voted Yes, if") sent over SSE (server-sent events). The browser applies each event to the session as it arrives.

The AI does two kinds of work, through one small provider layer (`lib/llm/`) that can use OpenAI (the default) or Anthropic:

1. **Structured calls** on a fast model: the moderator planning a turn, each thinker's scores, the poll lines, the summary. Each answer comes back as JSON and is checked against a Zod schema, so it always has the right shape. A bad answer is retried once.
2. **Speech calls** on a stronger model: a thinker talking in character, streamed word by word.

**The model never decides the verdict.** The thinkers give scores. Plain TypeScript functions in `lib/frameworks/` apply the rules (must-pass, the 60% line, weighted sums, likelihood × damage) and produce the verdict, plus a short "How this was decided" explanation in plain sentences. Those functions are unit-tested.

On screen, replies are written out by a quill at handwriting pace (`lib/store/reveal.tsx`), however fast the model streams them. **Demo mode** plays a scripted session through the same store and the same screens, with no network calls, and its verdicts still come from the real gate code.

Why this shape: one app, one AI provider at a time, no database and no accounts. That kept the full prototype buildable in the time available, and it keeps the kernel (a computed verdict) easy to test.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. **Landing.** The user opens `http://localhost:3000` and sees the landing page (`components/onboarding/Landing.tsx`). "Take a seat" moves on. The browser also calls `GET /api/config` to learn whether the server has a key.
2. **Choose the table.** The seat select (`SeatSelect.tsx`) shows the nine seatable thinkers. The user clicks, drags or uses the keyboard to seat 3 to 5 of them, and can invite Socrates as a guest. No server call.
3. **Ask.** The question step (`Onboarding.tsx`) offers three random example questions (`config/questions.ts`), personal questions drawn from today's news (`GET /api/topics`), and a table suggestion that matches words in the question (`suggestTable`). On Start, the browser builds a `Session` (`newSession` in `lib/store/reducer.ts`) and immediately sends the question to `POST /api/talk`.
4. **A table turn.** `/api/talk` validates the request (3 to 5 seats, no duplicates, Socrates never seated) and then:
   - makes one **moderator** structured call that returns a focus question, 2 speakers, 1 rebuttal, any new facts the user stated, whether a decision was detected, and which framework fits;
   - sends `plan`, `facts` and `focus` events (the browser pulses **Call the vote** when a decision was detected);
   - streams each speaker in order with a **speech** call, then the rebuttal. Each later speaker sees what was just said. Events: `speaker_start`, `delta`, `speaker_end`.
   The browser adds the bubbles; the quill writes them out; the speaking portrait lights up, and in a rebuttal the thinker being answered stays lit.
5. **More talk.** `@Name` (or a click on a portrait, then "Ask at the table") makes that thinker answer first. "Talk privately" opens a 1:1 where only that thinker answers. **Let them argue** runs another turn with no new message. **Sum up** calls `POST /api/summary` and adds a card with where they agree, where they disagree and what is still unknown. Tagging Socrates (if invited and unused) gets his one question.
6. **Call the vote.** The framework sheet (`FrameworkSheet.tsx`) opens with the moderator's suggestion pre-selected: **Should I?** (gate), **Which one?** (matrix) or **What could go wrong?** (pre-mortem). For the matrix, `MatrixSetupEditor.tsx` first calls `POST /api/vote/setup` and lets the user edit the options and weights.
7. **The vote runs.** `POST /api/vote` runs the shared pipeline (`lib/pipeline/runVote.ts`):
   - `setup`: gate criteria rewritten for this decision, the matrix setup, or the pre-mortem plan;
   - `scores`: one structured call per thinker, in parallel; vote tags appear under the portraits;
   - `debate`: 2 to 3 streamed turns between the thinkers who disagree most (Socrates opens a pre-mortem if invited and unused);
   - revisions: every thinker may re-score after the debate; changed votes get a "changed their vote" chip;
   - `poll`: one structured call writes one out-loud line per thinker, sent one by one;
   - `result`: the framework's compute function turns the final scores into a `VoteResult`.
8. **The verdict.** The browser stores the result and opens the verdict dialog (`components/results/ResultsPanel.tsx`): a papyrus scroll with the verdict in plain words and Greek, a seal, who voted what, the conditions or ranking or risks, "How this was decided", and a Details section. **Copy** puts it on the clipboard, **Save image** downloads a PNG, and the herald can read it aloud.
9. **What if…?** The user types a new fact. The browser adds it as a `fact` message and calls `/api/vote` again with the same framework and the previous result. The new verdict shows a was → now strip next to the old one.

## Stack
| Piece | Choice | Docs |
|---|---|---|
| Framework | Next.js 15.5 (App Router) | https://nextjs.org/docs |
| Language | TypeScript 5.9 (strict) | https://www.typescriptlang.org/docs |
| UI | React 19, Tailwind CSS 4 (`@tailwindcss/postcss`) | https://react.dev · https://tailwindcss.com/docs |
| Fonts | Cormorant Garamond, EB Garamond, Marcellus SC via `next/font/google` | https://nextjs.org/docs/app/api-reference/components/font |
| AI (default) | `openai` SDK 7.x, Responses API | https://platform.openai.com/docs/api-reference/responses |
| AI (option) | `@anthropic-ai/sdk` 1.x, Messages API | https://docs.claude.com/en/api/client-sdks |
| Validation | Zod 4, with each SDK's Zod helper (`zodTextFormat`, `zodOutputFormat`) | https://zod.dev |
| Verdict image | `html-to-image` (PNG of the scroll) | https://github.com/bubkoo/html-to-image |
| Tests | Vitest 5 | https://vitest.dev |
| Voice | Web Speech API (`speechSynthesis`, `SpeechRecognition`); ElevenLabs text to speech (optional) | https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API · https://elevenlabs.io/docs/api-reference/text-to-speech/convert |

Learner choices:
- **Next.js, TypeScript, Tailwind and Zod** come from the learner's brief (`CLAUDE.md`).
- **OpenAI is the default provider.** The learner switched to it during the build because the Anthropic account had no credits. Anthropic stays one env var away (`AI_PROVIDER=anthropic`). Tradeoff accepted: the Anthropic path is not re-tested since the switch.
- **Fast model for structured calls, stronger model for speeches**, chosen to keep votes quick and cheap while the voices stay good.

Not verified: the Anthropic path end to end since OpenAI became the default (see `devpost/open-points.md`, item 80).

## Where It Runs and How Someone Tries It
- **Local only.** No deployment (learner choice). Node.js 20 or newer.
- Needs one AI key in `.env.local`: `OPENAI_API_KEY` (default), or `ANTHROPIC_API_KEY` with `AI_PROVIDER=anthropic`. ElevenLabs is optional.
- Start:
  ```bash
  npm install
  cp .env.example .env.local   # then add your key
  npm run dev
  ```
  Open **http://localhost:3000**.
- **No key:** open **http://localhost:3000/?demo=1**, or add **#demo** to the address (`/#demo` starts the demo without a page load). A scripted session plays through the same UI with no API calls. The "Watch a sample debate" link on the landing page does the same.
- Other scripts: `npm test` (Vitest), `npm run typecheck`, `npm run build`, `npm start`.
- Submission: the public repo at https://github.com/anesask/symposium plus a 1 to 3 minute demo video. The video can be recorded in real mode or in demo mode.

## Look and Feel
From `prd.md > Look and Feel` and `scope.md > Inspiration & Identity`. One scene: an ancient Greek dinner table at night, wood and lamplight.

- **Palette:** red-figure pottery. Near-black warm background (`#0e0a08`), terracotta accent (`#b8643c`), bone (`#dcc89a`) for Yes, red (`#c0503e`) for Not yet, ochre (`#d2a24c`) for conditional, gold (`#c9a45c`) for labels. All tokens live in `app/globals.css`. Inside the verdict scroll the same tokens switch to sepia ink on papyrus.
- **Type:** Cormorant Garamond for the question, headings and verdicts; EB Garamond (with Greek) for reading text; Marcellus SC for labels and names, like Roman inscription capitals.
- **Art:** painted portraits (`public/portraits/*.webp`) and scenery (`public/scenes/*.webp`), generated with OpenAI Images. SVG placeholder portraits remain as a fallback (`PORTRAIT_FORMAT` in `config/art.ts`).
- **Layout:** on desktop the table takes the left 40% and never scrolls (question, known facts, the round table, one status line). The chat and composer take the right 60%. Below `lg` they stack, and phones show the table as a row of portraits.
- **Motion:** the quill writes replies at a set pace (Slow, Normal, Fast or Instant in Settings). The speaker's portrait glows, the verdict word is drawn in ink, the seal is pressed on. With "reduced motion" set in the OS, replies appear at once.
- **Sound:** optional lyre music, a crackling fire and small effects (seat, unseat, gong, verdict, speak), all off until the first click. Music and fire are off by default.
- **Words:** plain words in the UI: Yes / Yes, if / Maybe / Not yet, never GO / NO-GO. No em or en dashes anywhere on screen (`lib/text.ts` strips them from model output too). The tone is theatrical but short.

## Components

### Config: Roster, Scene, Gate, Questions
- `config/roster.ts`: the ten thinkers. Nine can be seated (Aristotle, Plato, Diogenes, Epicurus, Heraclitus, Pythagoras, Epictetus, Hypatia, Thucydides); Socrates is the guest. Each has a persona, a fixed `lean` (so the table really disagrees), a gate station, character-select stats and a signature move, an accent color and voice settings.
- `config/rooms.ts`: the single scene (`boardroom` id, named "Symposium"), its default five seats, opening line and examples.
- `config/gate.ts`: station labels, three default criteria per station with `mustPass` flags, and who covers a station nobody owns.
- `config/questions.ts`: example question pools (one yes/no, one choice, one already decided per visit) and the keyword rules behind `suggestTable`.
- `config/school.ts`: the plain-words guide shown on `/philosophers`. `config/art.ts`: portrait format and scene switches.
PRD ref: `prd.md > Features and Behavior` (seats and the cast).

### Prompts
`lib/prompts/common.ts` builds the thinker system prompt (persona, lean, the ancients-meet-modern-life rules, length limits, banned filler), the voter prompt for structured scoring, the question line with known facts, and the transcript (last 60 entries). `lib/prompts/talk.ts` builds the moderator prompt and the per-speaker turn prompt (answer, rebuttal, 1:1, Socrates).
PRD ref: `prd.md > Features and Behavior` (talking with the table).

### AI Provider Layer
`lib/llm/index.ts` picks the provider from `AI_PROVIDER` and exposes three helpers:
- `structured(schema, input)`: one structured call on the fast model, retried once on a parse or validation failure, then `StructuredError`. API errors (auth, billing, rate limit) are not retried here; the SDKs already retry twice.
- `speak(input)`: one streamed speech on the speech model.
- `describeError(err)`: turns SDK errors into `no_key`, `rate_limited` or `failed` with a readable message.
`lib/llm/openai.ts` uses `responses.parse` with `zodTextFormat` and `responses.stream`, with low reasoning effort. `lib/llm/anthropic.ts` uses `messages.parse` with `zodOutputFormat` and a streamed beta call with server-side fallback for refusals.
PRD ref: `prd.md > Features and Behavior`.

### Event Stream (SSE)
`lib/sse.ts`: `createEventStream()` gives a route a `text/event-stream` response and a typed `send`; `readEvents()` is the browser-side reader. Every event is a member of the `ServerEvent` union in `lib/types.ts`, which the demo script also uses. `send` strips long dashes from every event except raw text deltas.
PRD ref: `prd.md > The Core Journey`.

### Talk Route
`app/api/talk/route.ts` handles four kinds of request: a normal turn (moderator plan, 2 answers, 1 rebuttal; 3 answers when someone is tagged), **Let them argue** (`continueDebate`), a private **1:1** (`oneOnOne`, longer replies), and **Retry** of one failed speaker (`only`). Tagging Socrates gives his one question and sends `socrates_used`. New facts from the moderator are sent as a `facts` event.
PRD ref: `prd.md > Features and Behavior` (talk and calling the vote).

### Summary and Topics Routes
- `app/api/summary/route.ts`: **Sum up**. One structured call returns up to three points each for agree, disagree and unknown, plus any facts not yet known.
- `app/api/topics/route.ts`: **today's news**. Reads four public RSS feeds (BBC Technology, BBC Business, Guardian Money, Guardian Life), asks the model to turn six headlines into first-person decision questions, and caches the answer in memory for an hour. Returns an empty list if the feeds or the model fail.
PRD ref: `prd.md > Features and Behavior`.

### Vote Routes and Pipeline
- `app/api/vote/setup/route.ts`: proposes 2 to 4 matrix options and 5 weighted criteria (plain JSON, not SSE).
- `app/api/vote/route.ts`: validates the request and runs `runVote` with the right adapter.
- `lib/pipeline/runVote.ts`: setup, parallel scores, debate, revisions, poll, compute. A thinker whose scoring fails twice abstains. If fewer than half the table can score, the vote stops with an error. Auth, billing and rate-limit errors stop the whole vote.
- `lib/pipeline/gate.ts`, `matrix.ts`, `premortem.ts`: one `FrameworkAdapter` each (`lib/pipeline/types.ts`), supplying prompts, schemas, the debate plan, revision and diff. Re-runs keep the same gate criteria or matrix setup so the was → now comparison lines up.
PRD ref: `prd.md > Features and Behavior` (the three frameworks and the re-run).

### Framework Compute (pure, tested)
- `lib/frameworks/gate.ts`: assigns every station one owner (native first, otherwise the closest thinker, marked "covering"). Verdict: any No on a must-pass criterion gives **Not yet** with the flip condition; otherwise at least 60% clear yes gives **Yes**; otherwise **Yes, if** with up to 5 conditions (near-duplicates removed). Also each thinker's own vote, the tally, open risks, the scorecard and the trace.
- `lib/frameworks/matrix.ts`: cell averages, spread (2 or more points apart is "contested"), weighted totals and percentages, ranking, the decisive criterion, each thinker's own winner, and the sensitivity line (move each weight by one point and report the first change of winner).
- `lib/frameworks/premortem.ts`: averages likelihood, damage and mitigation credibility per cause, ranks by likelihood × damage, keeps the top 5. A cause is critical at likelihood 4 or more, damage 4 or more and mitigation credibility under 3. No critical cause: **Go ahead**; one: **Rethink first**; two or more: **Stop**.
- `lib/frameworks/diff.ts`: `compareResults` builds the was → now comparison between two results of the same framework.
PRD ref: `prd.md > Features and Behavior` (the three frameworks and the re-run).

### Session Store
- `lib/store/reducer.ts`: the `Session` shape, every user action and every `ServerEvent` applied to it, plus `toTranscript`, `sessionBrief` and `mergeFacts`.
- `lib/store/session.tsx`: React context with `useReducer`. Exposes `startSession`, `send`, `keepArguing`, `summarize`, `retry`, `callVote` and `newQuestion`. Restores and saves the session in `localStorage` (debounced, not in demo mode).
- `lib/store/reveal.tsx`: the pen-and-papyrus pacer. Thinker and poll messages are written out one after another at the chosen speed, faster when far behind; a click finishes a message at once; restored messages appear in full.
PRD ref: `prd.md > States and Boundaries`, `prd.md > Features and Behavior` (continuing after a verdict).

### Settings
`lib/settings.tsx`: per-browser preferences (mute, read the verdict aloud, writing speed, voice speed and volume, music, fire, effects) saved in `localStorage`. `components/ui/SettingsDialog.tsx` edits them; the top bar has one switch for all sound. `lib/useServerConfig.ts` fetches `/api/config`.
PRD ref: `prd.md > Features and Behavior` (voice).

### UI: Landing and Onboarding
`components/onboarding/Landing.tsx` (headline, how it works, three ways to decide, meet the table, sample debate link), `SeatSelect.tsx` (character select with drag and drop, keyboard support and the Socrates invitation) and `Onboarding.tsx` (question step with examples, news topics and table suggestion). `app/philosophers/page.tsx` is the guide to the thinkers.
PRD ref: `prd.md > The Core Journey`, `prd.md > Screens and Layout`.

### UI: Table, Feed and Composer
- `components/TableView.tsx`: the main layout, the missing-key banner, the portrait choice ("Ask at the table" or "Talk privately"), the 1:1 bar and the demo controls.
- `components/table/`: `RoundTable` (seats, speaker glow, addressed thinker, vote tags once voting starts, Socrates at the edge), `Portrait`, `VoteTag` (vote codes to plain words), `FactsBar` (the editable "They know" list).
- `components/feed/`: `Feed`, `Bubble` (moderator line, Socrates moment, Sum up card, failed state with Retry), `Ink` (the quill).
- `components/composer/Composer.tsx`: text box with the `@` picker, the "To:" picker for 1:1, Send, Sum up, Let them argue, **Call the vote** (pulses when a decision is detected) and the mic button when supported.
PRD ref: `prd.md > Screens and Layout`, `prd.md > Features and Behavior`.

### UI: Vote Sheet and Verdict
- `components/vote/FrameworkSheet.tsx` and `MatrixSetupEditor.tsx`: choose the framework; edit matrix options and weights.
- `components/results/VoteStatus.tsx`: the status line under the table (vote progress, then the latest verdict).
- `components/results/ResultsPanel.tsx`: the verdict dialog. Opens by itself for a new verdict; holds Copy, Save image, the herald, the was → now strip and the What if…? slip.
- `GateCard`, `MatrixCard`, `PremortemCard` (via `ResultCard`), inside `VerdictShell` (the scroll), with `Inscription` (ink word and Greek), `VerdictParts` (seal, voters row, details), `HowDecided`, `ChangedMinds`, `CountUp` and `icons`.
PRD ref: `prd.md > Features and Behavior` (the frameworks and the re-run).

### Voice and Sound
- `lib/voice/speak.ts`: the **herald** reads the verdict aloud. ElevenLabs through `POST /api/tts` when the server has it, cached per text; the browser voice otherwise or on any error. Also the plain-words verdict labels and the Copy text.
- `lib/voice/useSpeechInput.ts`: browser speech recognition for the mic button (Chrome and Edge; hidden elsewhere).
- `lib/audio/engine.ts`: music, fire and effects from `public/sounds/` (listed in `manifest.json`), with Web Audio stand-ins when a file is missing. The audio context starts on the first click or key press.
PRD ref: `prd.md > Features and Behavior` (voice).

### Demo Mode
`lib/demo/script.ts`: a hand-written, clearly labeled sample session ("Should I use AI to write my work emails, or is that cheating?") with Aristotle, Diogenes, Epicurus, Heraclitus and Hypatia: talk turns, an `@Epicurus` tag, a Sum up, a gate vote with debate and poll, then a What if…? re-run. Every verdict is computed by the real `computeGate`, and `tests/demo.test.ts` checks the story (Not yet before the debate, Yes, if after it, Yes after the re-run). `lib/demo/player.ts` feeds the steps into the same store with realistic timing. Started by `?demo=1` or `#demo` in `app/page.tsx`.
PRD ref: `prd.md > Features and Behavior` (demo mode).

### Config and TTS Routes
- `app/api/config/route.ts`: returns `{ hasKey, ttsProvider }`, never a key.
- `app/api/tts/route.ts`: ElevenLabs proxy for the herald, active only with `TTS_PROVIDER=elevenlabs` and a key.
PRD ref: `prd.md > States and Boundaries` (missing key, voice unavailable).

### Asset Scripts
`scripts/generate-portraits.mjs` and `generate-scenes.mjs` (OpenAI Images), `generate-music.mjs` and `generate-sounds.mjs` (ElevenLabs), and `make-portraits.mjs` (SVG placeholders, no API). Run once with `node --env-file=.env.local scripts/<name>.mjs`; the app only reads their output files.
PRD ref: `prd.md > Look and Feel`.

## Data Model
All shared types are in `lib/types.ts`; request and model-output schemas are in `lib/schemas.ts` and the adapters.

- **`Thinker`**: `id`, `name`, `shortName`, `archetype`, `station` (or null), `stationLabel`, `accentColor`, `stats`, `move`, `voice`, `persona`, `lean`.
- **`Room`**: the single scene: `id`, `name`, `tagline`, `defaultSeats`, `opening`, `examples`.
- **`Message`**: `id`, `kind` (user, thinker, moderator, fact, poll, notice, result), `speakerId?`, `text`, `status` (streaming, done, failed), plus optional `voteTag`, `changedVote`, `oneOnOne`, `resultId`, `replyTo` and `summary`.
- **`SessionBrief`**: what the server needs: seats, question, facts and the Socrates flags. The server gets this plus the transcript on every request.
- **Framework types**: a setup, a per-thinker score and a computed result for each framework (`GateSetup` / `GateThinkerScore` / `GateComputed`, and the same for matrix and pre-mortem). Every computed result carries `trace`, `thinkerVotes` and a `tally`.
- **`VoteResult`**: `id`, `framework`, `createdAt`, `trigger` (vote or rerun), `whatIf?`, `setup`, `scores`, `abstained`, `changes`, `pollLines`, `computed`, `previousResultId?`, and `causes` for a pre-mortem.
- **`ServerEvent`**: the union of every SSE event (plan, speaker_start, delta, speaker_end, speaker_error, focus, facts, notice, socrates_used, phase, setup, score, abstain, score_changed, poll_line, result, error, done).

The session (`lib/store/reducer.ts`):

```ts
Session {
  id, roomId, seats, socratesEnabled, socratesUsed, question,
  messages: Message[], results: VoteResult[], activeResultId?,
  mode: "talk" | "decide" | "results",
  decisionDetected, suggestedFramework,
  voteTags,            // latest vote per thinker, shown under the portraits
  vote?: LiveVote,     // the vote in progress: phase, setup, scores, abstained, changed
  oneOnOne?,           // the thinker in a private 1:1
  facts?               // what the table knows about the user (at most 12)
}
State { session: Session | null, busy, error?, notice? }
```

- **Where it lives:** the session in browser memory and `localStorage` (`symposium:session:v1`); settings in `symposium:settings:v1`. The server keeps nothing between requests except the one-hour news cache.
- **How it changes:** server events and user actions go through the reducer; the session is saved 400 ms after each change.
- **Leaving and coming back:** the last session comes back as it was. A message that was mid-stream comes back as failed with Retry; a vote in progress is dropped; if a verdict was showing, the mode is Results. A session saved with an older roster is discarded. **New question** (after a "Start over" confirm) clears it. The herald's audio cache is in memory only.

## File Structure
```
symposium/
├── app/
│   ├── layout.tsx                 # fonts, settings provider
│   ├── page.tsx                   # the one app screen; ?demo=1 or #demo switch
│   ├── globals.css                # palette tokens, papyrus theme, motion
│   ├── icon.svg                   # favicon (kylix)
│   ├── philosophers/page.tsx      # plain-words guide to the thinkers
│   └── api/
│       ├── talk/route.ts          # moderator + streamed speakers (SSE)
│       ├── summary/route.ts       # Sum up (JSON)
│       ├── topics/route.ts        # today's news as questions (JSON, cached 1 h)
│       ├── vote/route.ts          # shared vote pipeline (SSE)
│       ├── vote/setup/route.ts    # matrix options + weights (JSON)
│       ├── tts/route.ts           # ElevenLabs proxy for the herald (audio/mpeg)
│       └── config/route.ts        # { hasKey, ttsProvider }
├── components/
│   ├── TableView.tsx              # main layout: landing, onboarding or table
│   ├── onboarding/                # Landing, Onboarding, SeatSelect
│   ├── table/                     # RoundTable, Portrait, VoteTag, FactsBar
│   ├── feed/                      # Feed, Bubble, Ink
│   ├── composer/                  # Composer (@ picker, 1:1, vote button)
│   ├── vote/                      # FrameworkSheet, MatrixSetupEditor
│   ├── results/                   # verdict dialog, cards, scroll parts, VoteStatus
│   └── ui/                        # TopBar, SettingsDialog, VoiceButtons, SiteFooter
├── config/                        # roster, rooms, gate, questions, school, art
├── lib/
│   ├── types.ts  schemas.ts       # shared types, Zod schemas
│   ├── sse.ts                     # event stream writer + reader
│   ├── text.ts                    # strips long dashes
│   ├── settings.tsx               # per-browser preferences
│   ├── useServerConfig.ts         # reads /api/config
│   ├── llm/                       # index, openai, anthropic, types
│   ├── prompts/                   # common, talk
│   ├── pipeline/                  # runVote, types, gate, matrix, premortem adapters
│   ├── frameworks/                # gate, matrix, premortem, diff (pure, tested)
│   ├── store/                     # reducer, session, reveal (the quill pacer)
│   ├── voice/                     # speak (herald), useSpeechInput (mic)
│   ├── audio/engine.ts            # music, fire, effects
│   └── demo/                      # script (labeled sample data), player
├── public/
│   ├── portraits/                 # {id}.webp painted, {id}.svg placeholders
│   ├── scenes/                    # hall, stage, table, logo (.webp)
│   └── sounds/                    # music, fire, effects (.mp3) + manifest.json
├── scripts/                       # generate-portraits/scenes/music/sounds, make-portraits
├── tests/                         # gate, matrix, premortem, diff, demo, facts, questions, text
├── devpost/                       # Devpost learning workspace: scope, prd, spec, checklist, open points
├── CLAUDE.md                      # guide for Claude Code
├── README.md  LICENSE (MIT)  .env.example  .gitignore
└── package.json  package-lock.json  tsconfig.json  next.config.ts  postcss.config.mjs  vitest.config.mts
```
Not committed: `.env.local`, `devpost/learner-profile.md`, the concept sketches and local tooling folders (see `.gitignore`).

## External Services and Dependencies

### OpenAI (default AI provider)
- Key: `OPENAI_API_KEY` (server only). Models: `OPENAI_MODEL_FAST` (default `gpt-5.4-mini`) and `OPENAI_MODEL_SPEECH` (default `gpt-5.5`).
- Structured: `responses.parse({ model, reasoning: { effort: "low" }, instructions, input, text: { format: zodTextFormat(schema, "output") } })`, reading `output_parsed`.
- Speech: `responses.stream({ model, reasoning: { effort: "low" }, instructions, input })`, reading `response.output_text.delta` events.
- Docs: https://platform.openai.com/docs/api-reference/responses
- Also used offline by `scripts/generate-portraits.mjs` and `generate-scenes.mjs` (OpenAI Images, `gpt-image-1.5`).

### Anthropic (option, `AI_PROVIDER=anthropic`)
- Key: `ANTHROPIC_API_KEY`. Models: `ANTHROPIC_MODEL_FAST` (default `claude-haiku-5-5`) and `ANTHROPIC_MODEL_SPEECH` (default `claude-sonnet-5-5`).
- Structured: `messages.parse` with `output_config: { format: zodOutputFormat(schema), effort: "low" }`, reading `parsed_output`; a refusal counts as a failed attempt.
- Speech: `beta.messages.stream` with `betas: ["server-side-fallback-2026-07-01"]` and `fallbacks: "default"`; a final refusal adds "(declines to answer)".
- Docs: https://docs.claude.com/en/docs/build-with-claude/structured-outputs · https://docs.claude.com/en/docs/build-with-claude/streaming

**Call volume and cost (either provider):** a table turn is 1 structured call plus 3 speeches. A vote with n thinkers is about 2n + 2 structured calls plus 2 to 3 speeches (setup, n scores, n revisions, the poll), with up to 5 running at once. Rate limits depend on the account tier. Cost per session has not been measured (see `devpost/open-points.md`, items 81 and 82).

### ElevenLabs (optional)
- Runtime: `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128`, header `xi-api-key`, body `{ text, model_id }` (default `eleven_flash_v2_5`), answer `audio/mpeg`. Only the herald's verdict uses it, with one stock voice. Needs `TTS_PROVIDER=elevenlabs` and `ELEVENLABS_API_KEY`.
- Offline: `scripts/generate-music.mjs` and `generate-sounds.mjs` (Music and Sound Effects APIs) made the files in `public/sounds/`.
- Docs: https://elevenlabs.io/docs/api-reference/text-to-speech/convert. The free tier is about 10k characters a month; the browser caches each verdict's audio.

### RSS feeds
BBC Technology, BBC Business, The Guardian Money and The Guardian Life, read by `/api/topics` with a 6 second timeout. Only the headlines go to the AI provider.

### Browser APIs
`speechSynthesis` (herald fallback), `SpeechRecognition` / `webkitSpeechRecognition` (mic, Chrome and Edge), Web Audio (sound), Clipboard (Copy), `localStorage`.

## Important Failure Modes
- **A model answer doesn't fit the schema** → retried once. A thinker who still fails abstains (shown on the scroll) and the verdict is computed from the rest. If fewer than half can score, the vote stops with "Most of the table couldn't score this. Try calling the vote again." A failed revision keeps the earlier score; a failed poll falls back to each thinker's vote as their line; a failed moderator plan falls back to the two thinkers who spoke least recently.
- **A speech breaks mid-stream** → the bubble keeps its partial text, shows "lost their train of thought" and a **Retry** that re-asks just that thinker. A lost connection shows "Lost the connection to the table" (or "You're offline") and turns any streaming bubble into a failed one.
- **No key, a rejected key, or a rate limit** → `/api/config` reports no key: a banner with **Try the demo**, and Start and the composer are disabled. A rejected key or a rate limit during a call shows a clear error ("The table needs a breath. Try again in a moment.") and stops that turn or vote.
- **Voice or sound unavailable** → ElevenLabs errors fall back to the browser voice; no browser voice means silence. Missing sound files are replaced by synthesised ones. News feeds or the model failing simply hide the news cards.

## What Was Simplified and Why
- **One scene instead of three rooms** (Agora, Boardroom, Observatory). The learner chose this at the final review so the table stays readable on a laptop and the art could be done well once. The fuller version would bring back a room picker with its own art, accent and default seats.
- **Only the verdict is spoken** (the herald) instead of every message in a distinct voice per thinker. Quill pacing already carries the conversation, and one voice keeps ElevenLabs use small. The per-thinker voice ids are still in the roster.
- **A stateless server; the browser carries the session** instead of a database. One user, local, and no past-sessions list. The fuller version would need storage and accounts.
- **Speakers take turns** instead of talking over each other. Each sees the replies before theirs, which gives the feel of interrupting without parallel streams.
- **Demo mode is a hand-written event script** instead of a recorded live session. It is labeled sample data, deterministic for the video, and its verdicts still come from the real gate code.
- **CSS and `requestAnimationFrame` motion** instead of an animation library. The list of effects is short.

## Decisions and Open Issues
Learner choices:
- The stack from the brief (`CLAUDE.md`), **local only with no deployment**, and the **full prototype scope** rather than a cut-down proof of concept.
- **OpenAI as the default provider**, after the Anthropic account ran out of credits; Anthropic kept as an option.
- At the final review: the **all-Greek cast** with Socrates as guest, **one scene**, plain words instead of GO / NO-GO, the papyrus verdict, generated art and sound, and the herald.
- **No git commits during the build**; the learner makes one commit at the end.

Derived by the agent from those choices: the SSE event protocol, the shared `FrameworkAdapter` pipeline, sequential speakers, the browser-held session, fixed leans per thinker, the quill pacer, and the Vitest scope.

Learner uncertainty: none was identified during planning (the learner answered "none").

Still open (full list with priorities in `devpost/open-points.md`):
- Anthropic path untested since the switch; model names and cost per vote not checked (items 80 to 82).
- A vote that fails halfway is lost instead of retrying the failed step; in-flight requests aren't aborted on a new question (items 78, 79).
- The API routes have no rate limiting, so the app must not be deployed publicly as is (items 84, 85).
- Accessibility gaps: dialog focus trapping, contrast, a live region for new messages (items 89 to 93).
- No linting setup, no tests for the reveal pacer, no browser test suite (items 94 to 96).
- Leftover names from the three-room design (`RoomId "boardroom"`, `ROOMS`, `data-room`) (item 97).
- Landing and polish ideas not yet built: a product screenshot, "Skip to the verdict" in the demo, a unified button style, an Open Graph image (items 46, 47, 54, 59).
