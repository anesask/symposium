---
doc: prd
status: approved
---

# Symposium: Product Requirements

A table of ancient Greek philosophers who argue out your modern question in character, then vote with a real decision method and hand you a verdict computed in code. For someone making a hard decision alone at 2am.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

1. **Arrive.** The landing page says what Symposium is ("Argue it out with the greats."). Buttons: **Take a seat**, **Watch a sample debate** (demo mode) and **Meet the philosophers**.
2. **Choose the table.** A character-select screen shows nine thinkers. The user seats 3 to 5 of them by click, drag or keyboard. Socrates can be invited as a special guest.
3. **Ask.** The question screen shows the seated table. The user types a question, picks one of three example questions, or picks a question drawn from today's news. While they type, it suggests who would suit the question.
4. **Talk.** The table opens with the question and the round table. Each turn the moderator sets a focus, two thinkers answer and one rebuts. Replies are written out by quill on papyrus. The speaker lights up on the table.
5. **Steer.** The user can reply, `@` tag a thinker, talk privately with one thinker (1:1), press **Let them argue** for another turn, edit the facts the table knows, or press **Sum up**.
6. **Call the vote.** The user picks a method: "Should I?", "Which one?" or "What could go wrong?". The moderator suggests one.
7. **The vote runs.** The thinkers score in parallel, debate, re-score, and are polled one by one. Vote tags appear under the portraits.
8. **The verdict.** A dialog opens over the table with the papyrus scroll: the verdict in plain words, the Greek beneath, every thinker's vote, the conditions or risks, and "How this was decided".
9. **What if…?** The user changes one fact and votes again. The scroll shows the old verdict struck through and the new one beside it.
10. **Success** = the user leaves with a plain-word verdict and specific conditions they can check.

## Screens and Layout
- **Landing page:** logo, headline, a short pitch, the three actions from step 1, and a one-line introduction to each philosopher.
- **Seat screen:** a character-select grid of nine portraits, a detail panel for the hovered thinker (archetype, playful stats, signature move), five seat slots, and the Socrates guest card. Phones show "3 of 5 seated" instead of the slot row.
- **Question screen:** the seated table shown large, **Change the table**, a question box, three example chips, and "From today's news" cards.
- **The table:** one scene (warm wood and lamplight).
  - **Top bar:** logo, **New question**, settings, and one button that turns all sound off.
  - **Left (about 40%), never scrolls:** the question, the known facts ("They know"), the round table with portraits, and one status line (vote progress or the latest verdict).
  - **Right (about 60%):** the full-height debate feed and the composer at the bottom.
  - **Composer:** a "To:" picker (Table or 1:1 with one thinker), the message box with `@` picker, mic button (Chrome only), **Send**, **Sum up**, **Let them argue** and **Call the vote**.
  - Below 1024px the layout stacks. Phones show the table as a row of portraits.
- **Vote sheet:** "How should the table decide?" with the three methods. For "Which one?", the options and weighted criteria are shown and editable first.
- **Verdict dialog:** the papyrus scroll, a "Details" section under it, the "What if…?" slip, and **Copy**, **Save image** and **Back to the table**.
- **Settings dialog:** writing speed, the herald's voice, music, fire and effects.
- **The philosophers** (`/philosophers`): a plain-words guide to each thinker.

## Look and Feel
Source: `scope.md > Inspiration & Identity`.
- Dark, warm hall: wood, lamplight, cream text, gold accents.
- Painted portraits of the philosophers, one consistent style, generated for the project. They are AI paintings, not historical likenesses.
- The speaker shines: an enlarged portrait with a glow and a pool of lamplight while the others dim. The thinker being answered keeps a gold ring.
- Messages are papyrus sheets written out by a quill. Clicking a message being written finishes it at once.
- The verdict is a papyrus scroll in plain words with the Greek beneath, sealed with a red wax seal stamped with the kylix.
- Sound: optional lyre music, a crackling fire and small effects (all generated). Without the sound files, the browser synthesises stand-ins.
- Avoid generic AI-chat styling: no default blue, no plain bubbles on white, no consultant jargon on screen.

## Features and Behavior

### Landing and Seat Select
- Nine seatable thinkers: Aristotle, Plato, Diogenes, Epicurus, Heraclitus, Pythagoras, Epictetus, Hypatia and Thucydides. Socrates is a guest who never sits and never votes.
- Each thinker has an archetype, a fixed lean that shapes their votes, playful stats ("Our playful reading of them, not history.") and a signature move.
  - [ ] The landing page shows **Take a seat**, **Watch a sample debate** and **Meet the philosophers**.
  - [ ] A thinker can be seated by click, by drag, or with arrow keys and Enter. Delete unseats.
  - [ ] A sixth thinker cannot be seated. The server also rejects a table with more than 5 or fewer than 3 thinkers.
  - [ ] The Socrates card switches between **Invite** and **Invited ✓**.

### Asking the Question
  - [ ] The question screen shows three example questions: one yes/no, one choice, one already decided. They change between visits.
  - [ ] "From today's news" shows personal questions built from current headlines. If the feeds or the model fail, the section is simply empty.
  - [ ] Typing a question about money, people, work, screens, worry, habits or meaning shows a suggestion of who to seat, with one click to seat them.

### Talk
- Each turn: a moderator focus line, two answers and one rebuttal (three answers when someone is tagged). Every reply must add a new number, fact, test or example.
  - [ ] Moderator lines carry a small "The moderator" mark.
  - [ ] A rebuttal shows who answers whom (for example "Heraclitus → Pythagoras").
  - [ ] **Let them argue** runs another turn without user input.
  - [ ] Typing `@` opens a picker of seated thinkers. `@Plato …` makes Plato answer first.
  - [ ] Clicking a portrait offers "Ask at the table" or "Talk privately".
  - [ ] In 1:1 mode, the placeholder reads "Talk privately with [name]…" and only that thinker replies.
  - [ ] Tagging Socrates (if invited) shows a centred moment: his portrait, "Socrates asks" and one question. Tagging him again shows "Socrates has asked his question. He watches in silence now."
  - [ ] When the user states a fact ("€5,000 saved"), it appears under "They know" and can be edited. Later replies and votes use it.
  - [ ] **Sum up** writes where the table agrees, where it disagrees and what is still unknown.
  - [ ] **Call the vote** pulses when the question sounds like a decision. It is always clickable.

### Call the Vote
- One shared pipeline for all three methods: score in parallel, debate, re-score, poll, compute in code.
- The sheet pre-selects the moderator's suggestion: yes/no gives "Should I?", several options gives "Which one?", already decided gives "What could go wrong?". The user can override it.
  - [ ] Each method shows its friendly name with the technical name small beside it.
  - [ ] Thinkers who change their score during the debate show a "changed their vote" chip.

### "Should I?" (Go / No-Go gate)
- Five stations (Finance, Risk, Market, Personal, Long-term), three criteria each, rewritten for the question. Some criteria are must-haves.
  - [ ] A station with no owner at the table shows "covering" with the closest thinker's name.
  - [ ] Any "no" on a must-have gives **Not yet**, with what would need to change.
  - [ ] Otherwise, at least 60% clear yes gives **Yes**. Anything else gives **Yes, if…** with the conditions listed.

### "Which one?" (Decision matrix)
  - [ ] Before the vote, 2 to 4 options and the criteria with weights 1 to 5 are shown and editable.
  - [ ] Cells where the thinkers disagree strongly are flagged.
  - [ ] The result ranks the options with weighted totals and names the one change that would flip the ranking.

### "What could go wrong?" (Pre-mortem)
  - [ ] The premise "It is 12 months later. You did it. It failed." is shown.
  - [ ] The result lists the top five ways it fails, ranked by likelihood × damage, each with a fix and an early warning sign.
  - [ ] The call is **Go ahead**, **Rethink first** or **Stop**. A risk with likelihood 4 or more, damage 4 or more and no believable fix forces Rethink first or Stop.

### The Verdict Scroll
  - [ ] The verdict opens in a dialog when the vote finishes. "The verdict · Open" in the chat and the status line reopen it.
  - [ ] The scroll shows the verdict word, the Greek beneath, a row of portraits with each thinker's vote, and the wax seal.
  - [ ] "How this was decided" explains the result in plain sentences, not formulas.
  - [ ] "Details" holds the scorecard, what changed minds and the open risks (or the matrix table, or the warning checklist).
  - [ ] **Copy** puts the verdict and conditions on the clipboard as text. **Save image** downloads the scroll as a PNG.
  - [ ] With the herald on, the verdict is read aloud when it opens.

### What If…?
  - [ ] Typing a change in the "What if…?" slip and pressing **Vote again** re-runs the same method with the new fact.
  - [ ] The new scroll shows the old verdict struck through in red ink and the new one written beside it.

### Demo Mode
  - [ ] `/?demo=1` plays a scripted session ("Should I use AI to write my work emails, or is that cheating?") through the same UI, with no network calls. Its verdict is computed by the real gate code.

### Settings and Sound
  - [ ] Settings change the writing speed (Slow, Normal, Fast, Instant), the herald's voice (on/off, speed, volume), music, fire and effects (each on/off with volume).
  - [ ] One top-bar button turns all sound off.
  - [ ] The mic button fills the composer from speech in Chrome. Elsewhere it is hidden.

### The Philosophers Guide
  - [ ] `/philosophers` explains each thinker in plain words, for someone who has never read philosophy.

## States and Boundaries
- **First use:** the landing page. Example chips make it easy to start.
- **Returning:** the current session (seats, question, debate, verdicts) and the settings are restored from this browser. **New question** asks "Start a new question?" and clears it. There is no list of past sessions.
- **Empty question:** Send is disabled.
- **Calling the vote with no talk yet:** allowed. The vote runs on the question alone.
- **Missing API key:** a banner says the table isn't configured and offers **Try the demo**. The composer says "The table needs an API key, or try the demo."
- **A reply fails mid-way:** the partial text stays with a **Retry** button.
- **A thinker's scoring fails:** that thinker is marked **Abstained**, and the verdict is computed from the rest.
- **Socrates not invited and tagged:** a notice says "Socrates isn't invited to this table."
- **What leaves the browser:** the question and debate go to the AI provider. With the ElevenLabs herald on, the verdict text goes to ElevenLabs. No accounts, cookies or analytics.

## Product Decisions
- **Full prototype, not a cut-down PoC.** The learner had time; the safety net was building the methods in order and keeping demo mode.
- **Verdicts are computed in code, never asserted by the model.** This is the kernel (`scope.md > The Unique Kernel`).
- **Ancient Greek thinkers only, modern questions.** Real, public-domain figures. The philosophers meet modern life on their own terms.
- **Fixed leans per thinker,** so the table genuinely splits instead of agreeing politely.
- **Plain words on screen.** "Should I?", "Which one?", "What could go wrong?"; Yes / Yes, if… / Not yet; Go ahead / Rethink first / Stop. Technical names stay small.
- **One scene and a fixed two-column layout,** so the debate stays readable on a laptop without scrolling the table away.
- **Short turns:** two answers and one rebuttal, with "Let them argue" for more, so quill-speed writing doesn't drag.
- **OpenAI by default, Anthropic optional,** chosen in `.env.local`. Keys stay on the server.
- **The herald reads only the verdict.** The learner found a voice for every reply "overkill" and chose to keep it only on the verdict.
- **Re-run = full re-run of the same method** with the new fact, shown as was → now.
- **History:** the first plan had three rooms, a mixed roster with modern-shaped archetypes and different fonts. The final review replaced them with one scene and the Greek cast.

## What We're Building
Everything in `scope.md > The POC Boundary`: the landing page, seat select with nine thinkers and the Socrates guest, the question screen with examples and today's news, talk with moderator focus and rebuttal, `@` tags, 1:1, known facts and Sum up, all three methods on one pipeline, the papyrus verdict with copy, image and "What if…?", demo mode, settings with sound, mic input and the philosophers guide.

## Deferred From the POC
- **Public deploy:** the API routes are open, so anyone could spend the keys. It needs rate limiting first.
- **Per-thinker spoken voices:** the herald covers the demo. The voice ids in the roster are unused.
- **Past debates and search:** needs a session list; restoring the last session covers returning users.
- **Retry of a failed vote step:** today a failed vote shows an error and must be started again.

## Possible Later Enhancements
- A "Which philosopher are you?" mini quiz as a fun entry point.
- An info icon on each portrait that links to that thinker on the philosophers page.
- A "Skip to the verdict" button in demo mode.

## Non-Goals
- **Accounts or login:** single user, single browser by design.
- **Real quotations or historical likenesses:** the thinkers are AI interpretations in each one's style, and the portraits are AI paintings.
- **Professional advice:** Symposium is a thinking aid, not financial, legal or medical advice.

## Open Questions
- Should the Anthropic path be retested before submission? It hasn't been run since OpenAI became the default. Can wait.
- Is the cost per vote acceptable with the default models? Can wait.
