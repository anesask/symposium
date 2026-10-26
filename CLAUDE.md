# Symposium: guide for Claude Code

**Argue it out with the greats.** A user brings a modern question to a table of ancient Greek philosophers. They argue it out in character, then the user calls the vote and gets a verdict computed in code, with the conditions to meet. Built for Build With AI: Basics (Devpost). Planning docs live in `devpost/` (scope, PRD, spec, checklist, open points).

## Stack

Next.js 15 (App Router), React 19, TypeScript, Tailwind 4, Zod 4, Vitest. AI calls go through `lib/llm/` (OpenAI by default, Anthropic with `AI_PROVIDER=anthropic`); keys stay on the server. No database, no accounts: the session lives in `localStorage`.

```bash
npm run dev        # http://localhost:3000   (/?demo=1 or /#demo: scripted session, no API calls)
npm test           # Vitest
npm run typecheck
```

## The product, as built

- **Cast** (`config/roster.ts`): Aristotle, Plato, Diogenes, Epicurus, Heraclitus, Pythagoras, Epictetus, Hypatia, Thucydides, plus Socrates as a guest who asks one question and never votes. Each thinker has a persona, a fixed `lean` (so the table really disagrees), a gate station, stats and a signature move. The prompt treats them as ancients meeting modern life.
- **Flow** (`components/TableView.tsx`): landing page, seat select (character select with drag and drop), question (examples, today's news topics, table suggestions), then the table.
- **Talk** (`app/api/talk`): a moderator plans each turn (one focus, 2 answers, 1 rebuttal, new facts), speakers stream in turn. `@Name` tags, 1:1 mode, "Let them argue", and "Sum up" (`app/api/summary`). Facts the user states are kept on the session and passed to every prompt (`questionLine` in `lib/prompts/common.ts`).
- **Vote** (`lib/pipeline/`): one pipeline for three frameworks: score in parallel, debate, re-score, poll, compute. Shown to users as **Should I?** (Go / No-Go gate), **Which one?** (decision matrix) and **What could go wrong?** (pre-mortem).
- **Verdict** (`lib/frameworks/`): pure, unit-tested math; the model never decides the outcome. Each result carries a plain-sentence `trace` ("How this was decided"). Shown on a papyrus scroll with the Greek beneath, a seal, every thinker's vote, Copy, Save image, the herald voice and "What if…?" re-runs.
- **Pen and papyrus** (`lib/store/reveal.tsx`): replies are written out at a steady pace, one after another; reduced motion shows them at once.
- **Sound** (`lib/audio/engine.ts`): music, fire and effects from `public/sounds/` (generated with ElevenLabs), with Web Audio fallbacks; off until the first click.
- **Demo** (`lib/demo/`): the scripted AI-email session. Its verdicts are computed by the real gate code; `tests/demo.test.ts` checks the story (Not yet → Yes, if… → Yes).

## Conventions

- **Plain words in the UI:** Yes / Yes, if / Maybe / Not yet, never GO / NO-GO. Vote codes are mapped in `components/table/VoteTag.tsx` and `lib/voice/speak.ts`.
- **No em or en dashes** in code or anything shown to users; `lib/text.ts` strips them from model output too.
- **Look:** red-figure pottery palette (black, terracotta, bone, gold) defined in `app/globals.css`; fonts Cormorant Garamond (display), EB Garamond (body), Marcellus SC (labels). Primary buttons use `.btn-primary`.
- **Verdict logic stays in code**, with tests, and every structured model output is validated with Zod.
- Keep comments sparse and explain *why*. Match the surrounding code.
- Never commit secrets: `.env*` (except `.env.example`), `devpost/learner-profile.md` and `video/` are gitignored.
- Generated art and sound come from `scripts/generate-*.mjs`; rerun them rather than hand-editing the files.

## What's next

`devpost/open-points.md` lists the remaining improvements by priority. Don't deploy publicly before adding rate limiting: the API routes would spend the owner's OpenAI and ElevenLabs credits.
