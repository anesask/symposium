---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast. The learner chose concise output and **no per-slice commits**. The learner makes the commit at the end, so each `Commit:` line is the suggested message for that change.

## Slices

- [x] **1. Ask a question and hear the table argue (Talk, end to end)**
  Becomes usable: `npm run dev` opens a table with 5 default seats and a question pre-filled. A message makes the seated thinkers reply in character, streaming in and reacting to each other. A plain layout was fine at this stage.
  Why now: It proves the riskiest plumbing first: structured output for the moderator, streamed speeches, and SSE to the browser. Every later slice rides on this event path. Project setup is included.
  PRD ref: `prd.md > The Core Journey` (steps 2 to 3), `prd.md > Talk`
  Spec ref: `spec.md > Stack`, `spec.md > Config: Roster, Scene, Gate, Questions`, `spec.md > Prompts`, `spec.md > AI Provider Layer`, `spec.md > Event Stream (SSE)`, `spec.md > Talk Route`, `spec.md > Session Store`, `spec.md > File Structure`
  Build: Scaffolded Next 15.5, TypeScript, Tailwind 4, Zod 4, the Anthropic SDK and Vitest. Wrote `config/roster.ts`, `config/rooms.ts`, `lib/types.ts`, `lib/schemas.ts`, the model client (structured call and speech, retry once), `lib/sse.ts`, `lib/prompts/`, and `app/api/talk/route.ts` with the 3 to 5 seat check, plus the store reducer and a minimal page with feed and composer. Later changes: the model calls moved behind `lib/llm/` with OpenAI as the default, and the roster became the Greek cast (see Revisions and Final Review). In the final product, each turn the moderator picks a focus, two thinkers answer and one rebuts.
  Verify (mechanical): `npx tsc --noEmit` and `npm run build` pass. With the dev server running, `curl -N POST /api/talk` streams `plan`, `speaker_start`, `delta` events and `speaker_end` for each speaker. A body with 6 seats returns 400.
  Learner check: Run `npm run dev`, open http://localhost:3000, ask a question, and judge whether the voices sound distinct and actually disagree.
  Commit: `Talk mode: moderator + streamed in-character speakers`

- [x] **2. Call the vote and get a computed Go / No-Go verdict**
  Becomes usable: **Call the vote** runs the Go / No-Go gate. Per-thinker scores appear, 2 to 3 debate turns stream (changed votes are flagged), poll lines arrive one by one, and a result shows the computed verdict, tally, conditions and scorecard. In the final product the verdicts read in plain words: **Yes**, **Not yet** or **Yes, if…**.
  Why now: This is **the kernel**: a verdict computed in code from structured scores. It also builds the shared pipeline that the matrix and pre-mortem plug into later.
  PRD ref: `prd.md > Call the Vote`, `prd.md > "Should I?" (Go / No-Go gate)`
  Spec ref: `spec.md > Vote Routes and Pipeline`, `spec.md > Framework Compute (pure, tested)`, `spec.md > Data Model`, `spec.md > UI: Vote Sheet and Verdict`
  Build: `config/gate.ts`; `lib/frameworks/gate.ts` (station assignment, covering, verdict rule, tally, conditions); `lib/pipeline/runVote.ts` with the gate adapter (setup, parallel scores, debate and revisions, poll, compute; a seat abstains on failure); `app/api/vote/route.ts`; the vote button pulse on `decisionDetected`; a framework sheet; a basic `GateCard`.
  Verify (mechanical): `npx vitest run tests/gate.test.ts` passes. It covers a must-pass "no" with its flip condition, the 60% rule, "Yes, if", a covering station, a Life station mapped to Personal, and an abstained seat. `curl -N POST /api/vote` (gate) streams `setup`, one `score` per seat, the debate, one `poll_line` per seat and `result`, and the verdict matches the gate function run on the streamed scores.
  Learner check: After a few Talk turns, press Call the vote, watch it run, and say whether the verdict and conditions feel earned by what was said.
  Commit: `Go/No-Go gate: shared vote pipeline + computed verdict`

- [x] **3. Start your own session: rooms, seats, tagging, and coming back**
  Becomes usable: First run shows onboarding: pick seats (3 to 5, with Socrates as an optional guest), then a question with example chips. `@` tagging and portrait clicks force a speaker; Socrates asks his one question; a refresh restores the session; **New question** resets after a confirm step. Without a key, a banner offers the demo. The final product has one scene instead of three rooms and a character-select screen for the seats.
  Why now: It completes the front half of the PRD journey and persistence, so the next UI slice styles real flows rather than a hardcoded session.
  PRD ref: `prd.md > Landing and Seat Select`, `prd.md > Talk`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > UI: Landing and Onboarding`, `spec.md > UI: Table, Feed and Composer`, `spec.md > Session Store`, `spec.md > Config and TTS Routes`
  Build: Onboarding components; the `MentionPicker`; tag handling in the talk route (forced first speaker, Socrates once); `localStorage` persistence (debounced; a message cut off mid-stream is restored as failed with Retry); `/api/config`; the missing-key banner; the New question flow; example questions.
  Verify (mechanical): `npm run build` passes. `curl /api/config` returns `{hasKey:true,…}` without the key itself. A talk request with a `tag` streams that thinker first; tagging `socrates` twice yields one question and then a refusal event. In the browser, the seat count is clamped to 3 to 5 and the session survives a reload.
  Learner check: Clear site data, go through onboarding, tag a thinker, summon Socrates, refresh, and confirm everything is still there.
  Commit: `Onboarding, seats, @-tagging, Socrates, session persistence`

- [x] **4. It looks like the concept art**
  Becomes usable: The concept-art look: top bar, the question in a large serif, a round table seen from above with portrait circles, name and vote pills, an amber speaking ring, and Socrates at the edge. Debate cards carry vote pills and "changed their vote" chips. The verdict card has a big verdict, a segmented tally, conditions and expandable scorecard rows. Motion and a mobile layout with a bottom sheet are included. The final review later replaced this layout with a 40/60 table and chat split and a papyrus design (see Final Review).
  Why now: Design is 25% of judging, and an early hands-on look here lets feedback shape the remaining visuals.
  PRD ref: `prd.md > Screens and Layout`, `prd.md > Look and Feel`
  Spec ref: `spec.md > Look and Feel`, `spec.md > UI: Table, Feed and Composer`, `spec.md > UI: Vote Sheet and Verdict`
  Build: Color tokens in `globals.css`; placeholder portrait SVGs; `RoundTable`, `Portrait`, `VoteTag`, `SocratesGuest`; restyled `Bubble` and `Feed`; `TopBar`; `GateCard`, `TallyBar` and `Scorecard`; scene image slots with a vignette fallback; motion keyframes with reduced-motion support; a responsive layout and `BottomSheet`.
  Verify (mechanical): `npm run build` passes. Headless screenshots at 1440×900 and 390×844 (via the Chrome tools) are compared against `the-table-concept-art.png`, with no horizontal scroll on mobile.
  Learner check: Open it side by side with the concept art, run one Talk turn and a vote, and say what feels off.
  Commit: `Concept-art UI: round table, debate cards, verdict card, mobile`

- [x] **5. Decision matrix**
  Becomes usable: A question with options ("Lisbon, Berlin or London?") pre-selects the matrix. Options and weighted criteria are editable before the vote, contested cells are marked, and the result shows ranked options with bars, the decisive criterion and a sensitivity line. In the final product this method is called **Which one?**.
  Why now: The second framework on the proven pipeline, following the brief's order A, B, C.
  PRD ref: `prd.md > "Which one?" (Decision matrix)`, `prd.md > Call the Vote`
  Spec ref: `spec.md > Vote Routes and Pipeline`, `spec.md > Framework Compute (pure, tested)`, `spec.md > UI: Vote Sheet and Verdict`
  Build: `config/matrix.ts`, `lib/frameworks/matrix.ts`, the matrix adapter, `app/api/vote/setup/route.ts`, `MatrixSetupEditor`, `MatrixCard`.
  Verify (mechanical): `npx vitest run tests/matrix.test.ts` passes (weighted totals, ranking, contested spread, a sensitivity flip case and a no-flip case). `curl` to `/api/vote/setup` returns 2 to 4 options and 5 criteria; a matrix vote streams to a `result`.
  Learner check: Ask a 3-option question, change one weight, call the vote, and check whether the sensitivity line makes sense.
  Commit: `Decision matrix framework`

- [x] **6. Pre-mortem**
  Becomes usable: For a question that is already decided, the pre-mortem shows the premise, each thinker's failure cause and warning sign, the top 5 ranked by likelihood × damage with mitigations, an early-warning checklist, and a final call. In the final product this method is called **What could go wrong?** and the call reads **Go ahead**, **Rethink first** or **Stop**.
  Why now: The third framework completes the brief's set.
  PRD ref: `prd.md > "What could go wrong?" (Pre-mortem)`
  Spec ref: `spec.md > Vote Routes and Pipeline`, `spec.md > Framework Compute (pure, tested)`, `spec.md > UI: Vote Sheet and Verdict`
  Build: `config/premortem.ts`, `lib/frameworks/premortem.ts`, the premortem adapter, `PremortemCard`.
  Verify (mechanical): `npx vitest run tests/premortem.test.ts` passes (ranking, top 5, and the rule that a cause with likelihood 4+ and damage 4+ and no mitigation means rethink or stop, otherwise go ahead). A curl pre-mortem vote streams to a `result`.
  Learner check: Say "I've decided to launch my app next month", run the pre-mortem, and judge whether the risks are ones you would actually worry about.
  Commit: `Pre-mortem framework`

- [x] **7. Re-run with a change, and keep going after a verdict**
  Becomes usable: A what-if re-runs the same framework and shows a **was → now** strip. Results stay reachable, and the user can keep talking and vote again. In the final product this is the **What if…?** input on the verdict.
  Why now: It closes the last step of the core loop (`scope.md > The Core Loop` step 4) and the demo's last beat.
  PRD ref: `prd.md > What If…?`, `prd.md > The Verdict Scroll`
  Spec ref: `spec.md > Framework Compute (pure, tested)` (diff), `spec.md > Session Store`, `spec.md > UI: Vote Sheet and Verdict`
  Build: `lib/frameworks/diff.ts`, `RerunInput`, `WasNowStrip`, `ResultToggle`, and `fact` messages in the transcript.
  Verify (mechanical): `npx vitest run tests/diff.test.ts` passes for all 3 frameworks. `npm run build` passes.
  Learner check: Re-run a gate verdict with "what if I had 6 months of savings?" and check that the was → now strip tells the story.
  Commit: `Re-run with a change + result history`

- [x] **8. Voice out and voice in**
  Becomes usable: The speaker toggle reads messages aloud in order with a distinct voice per thinker, and the poll is read line by line. `TTS_PROVIDER=elevenlabs` switches to ElevenLabs. The mic dictates into the composer in Chrome. In the final product the voice is a herald who reads the verdict aloud, set in Settings.
  Why now: It is the demo's "polled out loud" beat, and it is isolated, so it is safe to add after the core works.
  PRD ref: `prd.md > Settings and Sound`
  Spec ref: `spec.md > Voice and Sound`, `spec.md > External Services and Dependencies` (ElevenLabs)
  Build: `lib/voice/*` (browser, ElevenLabs, queue, cache, `useSpeechInput`), `app/api/tts/route.ts`, the speaker toggle, the mic button, and muted and error states.
  Verify (mechanical): `npm run build` passes. `curl POST /api/tts` without an ElevenLabs key returns a clean 501 JSON error (with a key, an `audio/mpeg` body). In Chrome via the browser tools, the `speechSynthesis` queue logs fire in message order.
  Learner check: Turn the voice on, run a vote, and listen. Can you tell who is speaking?
  Commit: `Voice: browser TTS, ElevenLabs switch, mic input`

- [x] **9. Demo mode**
  Becomes usable: `/?demo=1` replays a scripted session (Talk with a tag, a gate vote, the poll, a verdict, a re-run) with real timing and no network. The final demo uses the question "Should I use AI to write my work emails, or is that cheating?" with Hypatia at the table, and `/#demo` starts it without a page load.
  Why now: Insurance for the video, built once the UI and event shapes were final.
  PRD ref: `prd.md > Demo Mode`
  Spec ref: `spec.md > Demo Mode`
  Build: The demo script in `lib/demo/` (labeled sample data; results computed by the real `gate.ts`) and `lib/demo/player.ts`.
  Verify (mechanical): A Vitest test confirms that the demo script's results equal the gate function run on its scripted scores. In the browser, with requests to `/api/*` observed, a demo run makes zero calls.
  Learner check: Open `/?demo=1` with Wi-Fi off and watch it end to end.
  Commit: `Demo mode: scripted freelance session`

- [x] **10. Ready for a stranger to run it**
  Becomes usable: A clean repo: README (what it is, setup, run, demo mode, env vars, art slots, privacy, not-advice note), MIT LICENSE, `.env.example`, and a footer disclaimer.
  Why now: These are the hackathon's required files, written last so they describe what was actually built.
  PRD ref: `prd.md > Non-Goals` (disclaimer), `prd.md > What We're Building`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`
  Build: README.md, LICENSE, `.env.example` (names only), and the footer disclaimer.
  Verify (mechanical): `npm run build` and `npx vitest run` pass. `git status --ignored` shows `.env.local` and `devpost/learner-profile.md` ignored. A search for `sk-ant` across files to be committed returns nothing.
  Learner check: Read the README as if you had never seen the project. Could you run it?
  Commit: `README, license, env example`

## Hands-on Checkpoints

- [x] Early usable behavior explored: after slice 2 (Talk and a computed verdict, plain UI). The learner chose to continue without stopping, and the feedback rolled into the final review.
- [x] Concept-art look reviewed: after slice 4, the learner compared it with the art and then asked for a full design pass (see Final Review).
- [x] Final kick-the-tires exploration and feedback completed: many rounds of hands-on feedback, recorded under Final Review.

## Final Review

- [x] **Debate area too small.** The learner said the UI was unusable because the question and table left only 79 to 213px for the conversation on laptop screens. After trying two layouts, the learner chose one table layout split 40/60: table and verdict on the left, full-height chat and composer on the right, stacked below 1024px. Checked with screenshots at 390, 820, 1366 and 1920 wide: the debate area grew to 634px at 1366×768 and nothing scrolls sideways.
- [x] **Table should not scroll, the speaker should shine, one scene, verdict in a dialog.** The left stage no longer scrolls, the speaker is enlarged with a glow while the others dim, the room picker and the extra rooms were removed, and verdicts open in a dialog that can be reopened. Checked on desktop and mobile at 390, 820, 1366 and 1920 wide.
- [x] **Real disagreement and visible arithmetic** (after the learner asked for a roast). Each thinker got a fixed lean used in every speaking and voting prompt, and a bug that counted "Conditional" as a no was fixed. Every result now shows "How this was decided", built by the same code that computes the verdict. A live vote with the original roster went from 1 to 4 to a stable 3 to 2 split, and 33 tests passed.
- [x] **1:1 mode and longer, sharper talk.** The learner found the talk too short and generic. A "To:" picker lets the user talk privately with one thinker (the lines stay in the transcript for the vote), each turn now has a moderator focus question with answers and rebuttals, and **Let them argue** continues without a user message. A live turn produced 5 replies (up from 2 to 3) with a concrete split.
- [x] **Greek-only cast with modern questions** (the learner's idea and roster). Aristotle, Plato, Diogenes, Epicurus, Heraclitus, Pythagoras, Epictetus, Hypatia and Thucydides, with Socrates as guest, replaced the original roster; each has a persona, lean and station. Examples, the demo and the portraits were redone, old saved sessions are dropped on load, and 33 tests passed with a live turn and vote checked.
- [x] **Design and feature rounds** from the learner's own testing: generated portraits, scenery and logo; new fonts and a papyrus palette; a character-select seat screen with drag and drop; a landing page and a philosophers guide; pen-and-papyrus writing; a sealed papyrus verdict scroll with Greek; settings with music, fire and effects; a mute button; today's news topics; facts the table remembers; Sum up; rebuttal highlighting; plain words instead of GO / NO-GO; and the fixes in `devpost/open-points.md`. Each was checked in a headless browser (desktop and 390px phone) and with live votes of all three frameworks; 40 tests pass.
- [x] Final review complete: feedback resolved and the learner confirmed "ready to ship" (Oct 26).

## Code Tour and App Map

- [ ] Learning activity complete: guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed: offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: skipped at the learner's choice to make the deadline (Oct 26); the boxes above stay unchecked on purpose.
Route and stops: not applicable (skipped).
Edit outcome: not applicable (skipped).
Reflection: not applicable (skipped).
Activity mode: not applicable (skipped).

## Revisions

- Oct 25 to 26, during the slices: OpenAI became the default AI provider (`gpt-5.4-mini` for structured calls, `gpt-5.5` for speeches) behind `lib/llm/`, with Anthropic kept as `AI_PROVIDER=anthropic`. The Anthropic account had no credits, so the learner added an OpenAI key.
- Oct 25 to 26, during the slices: demo mode was built early, during slices 2 to 4, so the vote and verdict UI could be checked with no API while credits were blocked. Slice 9 then only needed its final checks.
- Oct 25 to 26, during the slices: the slice 4 UI was built alongside slice 3, because the page layout was rewritten for onboarding anyway. Slice 4 was checked off after the mobile and concept-art checks.
- Oct 25 to 26, during the slices: thinker prompts were tuned for disagreement (`lib/prompts/common.ts`) after the first live run showed all speakers agreeing.
- Oct 25 to 26, during the slices: placeholder portraits were SVG with a one-line switch to PNG in `config/art.ts`, which also holds the scene art slots.
- Oct 26, final review: the layout became one 40/60 split (table and verdict left, full-height chat right) because the concept-art layout left too little room for the conversation. This updates `prd.md > Screens and Layout`.
- Oct 26: the Impressum page was removed and its privacy notes moved to the README. The demo now uses the AI-email question with Hypatia, and `/#demo` starts it without a page load.
