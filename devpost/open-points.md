# Symposium: done and open points

This file comes from a review on 2026-10-26, the hackathon deadline day. It lists what was fixed during the hackathon and what I would improve next.

Priority: **P0** must happen before anything else, **P1** soon, **P2** later.
Effort: **S** under 30 minutes, **M** an hour or two, **L** half a day or more.

## Where it stands

The core works end to end: talk, all three vote methods and the papyrus verdict were each run live and checked. The verdict now speaks plain words, the table argues in short turns, and the phone layout and reduced motion were checked. What is left is polish, safety before any public deploy, accessibility and tests.

## Done during the hackathon

### Submission and repo hygiene

- Deleted a stray API key file; keys live only in `.env.local`, which is gitignored.

### The verdict and the frameworks

- One plain language everywhere: Yes, Yes if, Maybe and Not yet (no more "GO, IF" or "NO-GO").
- "How this was decided" explains each framework in plain sentences.
- Decision matrix and pre-mortem verdicts checked live on the papyrus.
- Friendly framework names: Should I?, Which one? and What could go wrong?, with the technical name small beside them.
- Scorecard, changed minds, open risks, the matrix table and the warning checklist fold into one "Details" section under the scroll.
- A red wax seal with the kylix is pressed on once the verdict is written.
- The anonymous tally strokes became a voters row: each portrait with its vote in plain words.
- Every scroll shows who voted what.
- The verdict dialog header uses the friendly framework name.
- "Copy" puts the verdict and its conditions on the clipboard as plain text.
- "Save image" downloads the finished scroll as a PNG.
- Re-runs start from a papyrus slip: "What if…?" and "Vote again".
- On a re-run, the old verdict is struck through in red ink and the new one is written beside it.
- Pre-mortem calls use plain words with Greek beneath: Go ahead, Rethink first, Stop.

### Talk and debate quality

- Shorter turns: two answers and one rebuttal (three answers when someone is tagged).
- Moderator lines carry a small "The moderator" mark.
- Click a message being written to finish it at once.
- Every reply must add one new number, fact, test or example, and must not echo the user.
- Socrates gets a centred moment: his portrait and one large italic question.
- Clicking a portrait offers "Ask at the table" or "Talk privately".
- The thinker being answered keeps a gold ring on the table, and the label shows who answers whom.
- "Sum up" writes where they agree, where they disagree and what is still unknown.
- The moderator picks up facts you state; they show as an editable "They know" list that every thinker and vote uses.

### Seat select and onboarding

- Phone layout checked at 390px; fixed the crowded top bar and the news cards.
- The stats are labelled as "our playful reading of them, not history".
- Phones show "3 of 5 seated" with a short hint.
- Keyboard seating: arrow keys move, Enter seats, Delete unseats.
- The question screen shows your table large, with "Change the table" and "Ask them anything".
- Three fresh example questions per visit from a pool of 13 modern ones.
- As you type, it suggests who would suit the question, with one click to seat them.
- Socrates appears as a "Special guest" invitation card.

### Landing and the philosophers page

- Hero and "How it works" checked on a phone.

### Visual design and consistency

- Removed the leftover green from vote chips and the status pill.

### Sound and voice

- Music and fire download only when switched on.
- The audio context starts on the first click or key press, so the browser no longer warns.

### Pen and papyrus (the writing effect)

- With reduced motion, replies appear at once.
- Demo mode writes at least at "Fast" speed.

### Reliability and errors

- Gate, matrix and pre-mortem each ran live end to end, about 30 seconds each.

### Code quality and tests

- The SVG placeholder portraits are documented in the README as the no-API fallback.

## Open points

### Submission and repo hygiene

1. **[P1, S]** Add two or three screenshots or a GIF to the README (landing, table, papyrus verdict).
2. **[P1, S]** Bring `devpost/prd.md` and `devpost/spec.md` in line with what was built (Greek cast, landing, papyrus, sound, philosophers page).
3. **[P1, S]** Create `devpost/app-map.html`, a simple map of the app's parts.
4. **[P1, S]** Add a short "Built with" section to the README: OpenAI (talk and votes, portraits and scenery), ElevenLabs (music, sounds, herald), Next.js.
5. **[P2, M]** Deploy (for example on Vercel) so people can click a link. Add rate limiting first (see Security).

### Landing and the philosophers page

6. **[P1, S]** The landing has no picture of the product. Add a screenshot or a short loop of the table and the scroll under the hero.
7. **[P1, S]** "Watch a sample debate" has no skip. Add a "Skip to the verdict" button in demo mode.
8. **[P1, S]** The philosophers page is long. Add a sticky mini timeline or "back to top", and anchor links in the top bar.
9. **[P1, S]** Double-check the facts on the philosophers page (dates, places and reading suggestions) against one reliable source.
10. **[P2, M]** Add a three-question "Which philosopher are you?" quiz as a fun entry point.
11. **[P2, S]** Link each philosopher on the table to their section on the philosophers page (an info icon on the portrait).

### Visual design and consistency

12. **[P1, S]** The hall image behind the table ends in a hard line at the column edge. Feather it into the page.
13. **[P1, S]** The composer's buttons ("Table", "Send", "Let them argue", "Call the vote") use four different styles. Unify them.
14. **[P1, S]** Small uppercase labels are hard to read. Use at least 0.75rem and less letter spacing.
15. **[P1, S]** User messages (terracotta bubbles) and thinker messages (papyrus sheets) look like two different apps. Make the user's message a wax tablet note or plain italic.
16. **[P1, S]** The logo is bright orange against a muted palette. Make a sepia or gold version for the top bar.
17. **[P1, S]** The favicon is still the old line-drawn kylix (`app/icon.svg`). Use the new logo.
18. **[P1, S]** Add an Open Graph image and description, so shared links look good.
19. **[P2, S]** Clean up dead CSS from earlier designs (`.caret`, `.spotlight`, the old room scene rules) and the `roomArt` prop.
20. **[P2, M]** Use the generated tabletop more: put the cup and lamp in the centre and add a lamp glow that follows the speaker.
21. **[P2, S]** The scroll rods are plain CSS. A generated rod image with carved ends would look richer.

### Sound and voice

22. **[P1, S]** Listen to all seven sounds in a real browser. They were only checked by measuring loudness. Replace any that sound off.
23. **[P1, S]** Pick and test the herald's ElevenLabs voice (`MODERATOR_VOICE`). The current stock voice was chosen blind.
24. **[P1, S]** Add a small music on/off button or "now playing" sign next to the mute button, so people know music exists.
25. **[P2, S]** Remove the unused per-thinker ElevenLabs voice ids from the roster, or use them for a "hear this thinker" button.
26. **[P2, S]** Mute should also stop the herald mid-sentence. Today it only stops future reading.
27. **[P2, M]** Lower the music under the herald's voice and fade it on the verdict.

### Pen and papyrus (the writing effect)

28. **[P1, M]** The writing pacer re-renders the whole table about 40 times a second. Move it into the feed, or memoise the table, so it stays smooth on slow laptops.
29. **[P1, S]** When you scroll up to read, the quill keeps writing below with no cue. Add a "↓ writing…" pill.
30. **[P2, S]** The quill icon is small and a little crude. Draw a better feather or use a generated image.

### Reliability and errors

31. **[P1, M]** If a vote fails halfway, the user sees an error and loses the vote. Retry the failed step once, then show a clear "try again".
32. **[P1, S]** Abort requests still running when the user starts a new question, so a late reply can't land in the new session.
33. **[P1, S]** The Anthropic provider has not been tested since OpenAI became the default. Test it, or mark it "untested" in the README.
34. **[P1, S]** Confirm the model choices (`gpt-5.4-mini`, `gpt-5.5`) and add a cost per vote note to the README.
35. **[P2, M]** Log token usage per request (development only) to see what a session really costs.
36. **[P2, S]** `localStorage` keeps one session forever. Add a size guard and a version migration.

### Security and abuse (before any public deploy)

37. **[P0, S]** Don't deploy publicly as it is. `/api/talk`, `/api/vote` and `/api/tts` are open, so anyone could spend your OpenAI and ElevenLabs credits.
38. **[P1, M]** Add basic rate limiting per IP and a daily cap per key.
39. **[P1, S]** Check that the server caps on question and message length are tight enough.
40. **[P1, S]** A user can tell the thinkers to "ignore your persona". Low risk, but add one guard line to the system prompts.
41. **[P2, S]** Add security headers (CSP, frame-ancestors) in `next.config.ts`.

### Accessibility

42. **[P1, M]** Dialogs (settings, verdict, start over) don't trap focus, and focus doesn't return to the button that opened them.
43. **[P1, S]** Some muted and small text on the dark background fails WCAG contrast (footer, labels). Check with a contrast tool.
44. **[P1, S]** The ink-drawn verdict word is an SVG with an aria-label. Check that screen readers announce the verdict once, not twice.
45. **[P2, S]** Announce new messages politely to screen readers with an `aria-live` region on the feed.
46. **[P2, S]** Greek lines need `lang="grc"` everywhere (done on the scroll) so screen readers don't spell them out.

### Code quality and tests

47. **[P1, S]** Linting isn't set up. Add the Next ESLint config and a `lint` script.
48. **[P1, M]** Add tests for the writing pacer (order, empty messages, speed) and `stripDashes`.
49. **[P1, M]** Turn the headless browser checks used during the build (landing, seat select, demo to verdict, settings) into a small Playwright suite in the repo.
50. **[P2, S]** Rename leftovers of the old room system for the single hall: `RoomId "boardroom"`, `ROOMS`, `data-room` and `ROOM_ART.boardroom`.
51. **[P2, S]** Resize the portraits to 512px. Together they weigh about 2.8 MB, about four times more than the screen needs.
52. **[P2, M]** Split `TableView.tsx` (layout, pacer, sound, landing switch and dialogs in one file) into smaller pieces.
