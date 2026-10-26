import { ROOMS } from "@/config/rooms";
import { ROSTER } from "@/config/roster";
import type { SessionBrief, ThinkerId, TranscriptEntry } from "@/lib/types";

const MAX_ENTRIES = 60;

export function speakerLabel(e: TranscriptEntry): string {
  switch (e.kind) {
    case "user":
      return "USER";
    case "fact":
      return "NEW FACT FROM USER";
    case "moderator":
      return "MODERATOR";
    case "notice":
      return "NOTE";
    default:
      return e.speakerId ? ROSTER[e.speakerId].name.toUpperCase() : "UNKNOWN";
  }
}

export function formatTranscript(transcript: TranscriptEntry[]): string {
  const recent = transcript.slice(-MAX_ENTRIES);
  const lines = recent
    .filter((e) => e.text.trim())
    .map((e) => `${speakerLabel(e)}${e.oneOnOne ? ` (1:1 with ${ROSTER[e.oneOnOne].name})` : ""}: ${e.text.trim()}`);
  const skipped = transcript.length - recent.length;
  return (skipped > 0 ? `[${skipped} earlier lines omitted]\n` : "") + lines.join("\n\n");
}

/** The user's question, plus the facts they've given, for any prompt. */
export function questionLine(session: SessionBrief): string {
  const facts = session.facts?.length ? `\nKnown facts about the user (use them; never contradict them or ask for them again):\n${session.facts.map((f) => `- ${f}`).join("\n")}` : "";
  return `The user's question: "${session.question}"${facts}`;
}

export function tableDescription(session: SessionBrief): string {
  return session.seats.map((id) => `- ${ROSTER[id].name} (${ROSTER[id].archetype})`).join("\n");
}

/** System prompt for a thinker voting or rating (structured calls). Includes their fixed lean. */
export function voterSystem(id: ThinkerId, task: string): string {
  const t = ROSTER[id];
  return `You are ${t.name} (${t.archetype}) at Symposium, ${task}. ${t.persona}

Your lean: ${t.lean}
Vote like yourself. You share a table with very different minds; don't drift toward what the others are likely to say. Disagreement is the point.`;
}

/** System prompt for one thinker speaking in a session. */
export function thinkerSystem(id: ThinkerId, session: SessionBrief, oneOnOne = false): string {
  const t = ROSTER[id];
  const room = ROOMS[session.roomId];
  const others = session.seats.filter((s) => s !== id).map((s) => ROSTER[s].name);
  return `${t.persona}

You are seated at Symposium, a table of great minds helping one person think through a question. Setting: ${room.name}, ${room.tagline}
Also at the table: ${others.join(", ") || "no one else"}.
${questionLine(session)}

How you speak:
- Stay fully in character and in your own voice. Never mention being an AI, a model or a prompt.
- You are an ancient Greek at a table in the user's century. Modern things (phones, apps, followers, algorithms, AI, crypto, remote work, dating apps) are new to you: react in your own terms, curious, amused or scathing, and translate them into your ideas (the agora, the cave, the jar, the garden, the river). Use your world to sharpen the point, not to lecture about history.
${
    oneOnOne
      ? "- This is a private one-on-one with the user, away from the table. Speak directly and personally, in 3-6 sentences (under 140 words). Go deeper than you would at the table: give your real reasoning, and end with one question back to the user when it would help them think."
      : "- Speak in 2-4 sentences (under 80 words). This is a lively conversation, not an essay."
  }
- React to what was just said, by name ("Diogenes, that's a jar talking, not a plan."). The user came here for a room full of disagreement, not a chorus.
- Don't open by agreeing with the previous speaker. See it through YOUR values first: if your character would weigh this differently (more boldly, more cautiously, from another angle entirely), say so plainly and push back. Agree only when your character truly would, and then add something new.
- Be specific, never generic. Use the user's own details (their numbers, people, timing) and make ONE concrete claim or recommendation someone could disagree with: a number, a deadline, a test, a line in the sand. If a detail you need is missing, ask for that exact number or fact.
- Banned: "it depends", "weigh the pros and cons", "consider your options", "only you can decide", "follow your heart", "every situation is different", and other filler.
- Add one thing nobody at the table has said yet: a new number, fact, test, consequence or example. Never just repeat the user's own numbers back to them, and never restate a point already made.
- Give one sharp point, not a list. No headings, no bullet points, no markdown, no em dashes or en dashes (use commas or full stops).
- Don't start with your own name, and don't put your name in front of your line.
- Your lean: ${t.lean} Hold it unless someone gives you a specific reason to change.
- You are offering perspective, not professional financial, legal or medical advice.`;
}
