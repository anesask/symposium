import { ROSTER } from "@/config/roster";
import type { SessionBrief, ThinkerId, TranscriptEntry } from "@/lib/types";
import { formatTranscript, questionLine, tableDescription } from "./common";

export function moderatorPrompt(session: SessionBrief, transcript: TranscriptEntry[], lastSpeakers: ThinkerId[], continuing: boolean) {
  const system = `You are the moderator of Symposium, a table of thinkers helping a user with a question or decision. You don't speak; you run the table.

Each turn you decide:
- focus: ONE sharp, concrete sub-question this turn should settle, built from the user's actual details (e.g. "Is one maybe-client worth €2k a month enough income to quit on?", "How many months of runway is enough with €1,000 of debt?"). Never a vague topic like "pros and cons". Move the conversation forward: don't repeat a focus already argued.
- speakers: 2 seated thinkers who will answer, in order (3 only if the user addressed someone who must answer as well). Prefer the ones whose leans clash on this focus, so the user hears real disagreement. Avoid the thinkers who spoke last turn (${lastSpeakers.join(", ") || "none"}) unless they were addressed.
- facts: the concrete facts the user stated in their LATEST message (amounts, dates, people, constraints), each a short phrase under 60 characters like "€5,000 saved" or "rent is €900 a month". Empty if they gave none. Don't repeat facts already known.
- rebuttals: exactly 1 follow-up where a thinker answers another thinker who spoke this turn ("speaker" replies to "replyTo"). Pick the sharpest disagreement. A speaker may rebut even if they already spoke this turn, but never themselves.
${continuing ? "\nThe user asked the table to keep arguing without adding anything: pick the most important unresolved disagreement and push it further.\n" : ""}
Classify the user's overall question:
- decisionDetected: true if the user is weighing a decision ("should I...", "A or B", "is it worth...", "I've decided to...").
- suggestedFramework: "gate" for a yes/no decision, "matrix" for choosing between 2-4 named options, "premortem" when they have mostly decided and want to stress-test it.`;

  const user = `Seated thinkers (use these ids), with how they lean:
${session.seats.map((id) => `- ${id}: ${ROSTER[id].name}, ${ROSTER[id].archetype}. ${ROSTER[id].lean}`).join("\n")}

${questionLine(session)}

Conversation so far:
${formatTranscript(transcript) || "(nothing yet)"}`;
  return { system, user };
}

export type TurnRole =
  | { kind: "answer"; focus: string; tagged: boolean }
  | { kind: "rebut"; focus: string; replyTo: ThinkerId }
  | { kind: "oneOnOne" }
  | { kind: "socrates" };

export function speakerTurnPrompt(session: SessionBrief, transcript: TranscriptEntry[], speaker: ThinkerId, role: TurnRole) {
  const t = ROSTER[speaker];
  const lastUser = [...transcript].reverse().find((e) => e.kind === "user");
  let ask: string;
  switch (role.kind) {
    case "oneOnOne":
      ask = `You and the user have stepped away from the table for a one-on-one. Answer their latest message ("${lastUser?.text ?? ""}") directly, as ${t.name}.`;
      break;
    case "socrates":
      ask = "You have been summoned for your one question. Ask it now, then fall silent.";
      break;
    case "rebut":
      ask = `The moderator's focus: ${role.focus}
${ROSTER[role.replyTo].name} just argued their side. Answer them by name, in your own voice: attack the weakest specific claim they made, or concede one point and then push further. Bring something new; don't restate your earlier point.`;
      break;
    default:
      ask = `The moderator's focus for this turn: ${role.focus}
${
  role.tagged
    ? `The user addressed you directly ("${lastUser?.text ?? ""}"). Answer them first, in character, then take a clear side on the focus.`
    : `It's your turn, ${t.name}. Take a clear side on the focus. If others just spoke, don't echo them: bring the angle only you would bring, and challenge whoever you most disagree with.`
}`;
  }
  return `The table so far:
${tableDescription(session)}

Conversation:
${formatTranscript(transcript)}

${ask}`;
}
