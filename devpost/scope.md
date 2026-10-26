---
doc: scope
status: approved
---

# Symposium

A table of ancient Greek philosophers who argue out your modern question in character, then vote with a real decision method. Tagline: "Argue it out with the greats."

## The Unique Kernel
**Disagreement that ends in a decision.** Most AI gives you one careful, polite answer. Symposium gives you a table of thinkers who disagree with each other, then makes them vote with a real method. The verdict is **computed in code** from their structured votes, never asserted by the model. You leave with a plain-word verdict and the conditions to meet.

## Who It's For
Someone facing a hard personal or work decision alone, often at 2am with no one to argue with. Their questions are modern: should I use AI at work, quit my job, move abroad, delete Instagram. Today they ask one chatbot and get one hedged answer, or they lie awake arguing with themselves.

## The Core Loop
1. Take a seat: choose 3 to 5 philosophers for the table. Socrates can join as a guest.
2. Ask a question: type one, pick an example, or start from today's news.
3. Let them argue. Each turn the moderator sets a focus, two thinkers answer and one rebuts. Tag anyone with `@`, or talk to one of them privately.
4. **Call the vote** with one of three methods: "Should I?", "Which one?" or "What could go wrong?".
5. Read the verdict on the papyrus scroll, then ask "What if…?" to change one fact and vote again.

They come back for the next hard decision, or to re-run this one when their situation changes.

## Inspiration & Identity
- Plato's *Symposium*: a dinner party where the guests take turns making their case. Logo: a kylix (Greek drinking cup).
- One scene: a warm hall with wood and lamplight. Painted portraits of the philosophers. Replies are written out by quill on papyrus. The verdict is a papyrus scroll in plain words with the Greek beneath, closed with a wax seal.
- Sound: optional background music, a crackling fire and small effects. A herald can read the verdict aloud.
- Real decision methods: stage-gate reviews and the NASA launch poll (go / no-go), Pugh-style weighted matrices, Gary Klein's pre-mortem.
- Tone: theatrical but useful. Each thinker has a fixed lean, so the table splits instead of agreeing politely (Pythagoras wants the numbers to balance, Heraclitus bets on change, Diogenes votes against anything done for status).

## Why This Matters to the Learner
"Big decisions get made alone at 2am, with no one to argue with." The learner wanted to ship a polished, working prototype by the deadline, built plan-first.

## What "Working" Looks Like
The demo, end to end on screen: the landing page, the seat screen, the question "Should I use AI to write my work emails, or is that cheating?", a few turns of in-character debate including an `@` tag, **Call the vote**, the table polled one by one, and the verdict written on the scroll with the conditions. Then one "What if…?" re-run that shows what changed.

**The "oh, that's cool" beat:** thinkers who just argued in character each cast a vote, and the scroll reads "Yes, if…" with concrete conditions, computed from those votes.

## The POC Boundary
The learner chose the **full prototype**, not a cut-down slice:
- A landing page, a character-select seat screen (3 to 5 of nine thinkers) and Socrates as a one-question guest.
- A question screen with example questions and questions from today's news.
- Talk: moderator focus, answers and a rebuttal per turn, "Let them argue", `@` tags, 1:1 talk, known facts, "Sum up".
- All three methods on one shared pipeline (score, debate, re-score, poll, compute in code).
- The papyrus verdict with "How this was decided", copy, save as image, and "What if…?" re-runs.
- Demo mode (`?demo=1`) as insurance for the video.
- Settings for writing speed, the herald's voice, music, fire and effects. Mic input in Chrome.
- A plain-words guide to the philosophers (`/philosophers`).

## Later
- A public deploy, with rate limiting first.
- A distinct spoken voice for each thinker during the debate.
- Past debates and search.

## Explicitly Cut
- **Accounts and login:** not needed to prove the kernel. One user, one browser.
- **Database:** the browser's `localStorage` holds the current session and settings.
- **Past-debates page:** it doesn't change the core loop; restoring the last session is enough.
