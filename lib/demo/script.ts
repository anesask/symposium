// SAMPLE DATA: a hand-written demo session ("Should I use AI to write my work emails?").
// The talk and poll lines are scripted; every verdict is computed by the real
// lib/frameworks/gate.ts from the scripted scores, exactly as in live mode.

import { computeGate, defaultGateSetup, thinkerVote } from "@/lib/frameworks/gate";
import type { GateSetup, GateThinkerScore, GateVote, ServerEvent, TableSummary, ThinkerId, VoteResult } from "@/lib/types";

export const DEMO_SESSION = {
  roomId: "boardroom" as const,
  seats: ["aristotle", "diogenes", "epicurus", "heraclitus", "hypatia"] as ThinkerId[],
  question: "Should I use AI to write my work emails, or is that cheating?",
  socratesEnabled: true,
};

export type DemoStep =
  | { kind: "wait"; ms: number }
  | { kind: "type"; text: string; tag?: ThinkerId } // the user "types" a message
  | { kind: "events"; events: ServerEvent[] }
  | { kind: "speak"; speakerId: ThinkerId; text: string; resultId?: string; replyTo?: ThinkerId }
  | { kind: "summary"; summary: TableSummary }
  | { kind: "vote"; resultId: string; whatIf?: string; initial: GateThinkerScore[] }
  | { kind: "revise"; resultId: string; score: GateThinkerScore; changes: VoteResult["changes"] }
  | { kind: "poll"; resultId: string; lines: { thinkerId: ThinkerId; text: string }[]; setup: GateSetup; scores: GateThinkerScore[] }
  | { kind: "result"; result: VoteResult };

// With this table, Hypatia covers Finance (time and cost) and Diogenes covers Market (how it lands with people).
const LABELS = {
  finance: ["The time saved is real, not imagined", "Mistakes are cheap to catch", "You can measure it within a week"],
  risk: ["Worst case: an awkward email, not a lost client", "You can go back to writing them yourself", "The upside beats the risk"],
  market: ["People still hear your voice", "It's for the dull emails, not the delicate ones", "You're open about it"],
  personal: ["It frees time for the people you like", "You won't live in fear of being found out", "You'd say it out loud to your boss"],
  longterm: ["You keep the skill of writing", "It builds a habit you're proud of", "Keeps your own voice in practice"],
};

export const DEMO_SETUP: GateSetup = defaultGateSetup(DEMO_SESSION.seats, LABELS);

type V = [GateVote, string, string?];
function score(thinkerId: ThinkerId, votes: Record<string, V>): GateThinkerScore {
  return {
    framework: "gate",
    thinkerId,
    stations: DEMO_SETUP.stations
      .filter((s) => s.ownerId === thinkerId)
      .map((s) => ({
        station: s.station,
        votes: s.criteria.map((c) => {
          const [vote, reason, condition] = votes[c.id];
          return { criterionId: c.id, vote, reason, condition };
        }),
      })),
  };
}

const HYPATIA = score("hypatia", {
  "finance-1": ["CONDITIONAL", "Ten hours a week is a claim until it is measured.", "Track the hours you save for one week"],
  "finance-2": ["CONDITIONAL", "Only if someone reads before it is sent.", "Read every line before it goes out"],
  "finance-3": ["GO", "A week of counting settles it."],
});
const HERACLITUS = score("heraclitus", {
  "risk-1": ["GO", "An odd sentence is a ripple, not a flood."],
  "risk-2": ["GO", "The pen does not forget your hand."],
  "risk-3": ["GO", "Standing still costs ten hours a week."],
});
const DIOGENES = score("diogenes", {
  "market-1": ["GO", "Your voice is in what you choose to say, not in the commas."],
  "market-2": ["CONDITIONAL", "The delicate ones deserve your own hand.", "Write the delicate emails yourself"],
  "market-3": ["CONDITIONAL", "Shame needs a secret to live.", "Tell your team you use it"],
});
// --- First vote: Epicurus blocks on calm (a must-pass criterion): hiding it would cost peace of mind.
const EPICURUS_BLOCKS = score("epicurus", {
  "personal-1": ["GO", "Two free hours a day is a garden."],
  "personal-2": ["NO-GO", "A pleasure you must hide is not a pleasure.", "Tell your team you use it"],
  "personal-3": ["GO", "Only if you'd say it aloud, and you would."],
});
const ARISTOTLE = score("aristotle", {
  "longterm-1": ["CONDITIONAL", "A skill unused withers.", "Write one important email a day yourself"],
  "longterm-2": ["GO", "Delegating the dull is prudence, not vice."],
  "longterm-3": ["CONDITIONAL", "The mean: the machine drafts, you decide.", "Keep the important replies in your own words"],
});
const FIRST: GateThinkerScore[] = [HYPATIA, HERACLITUS, DIOGENES, EPICURUS_BLOCKS, ARISTOTLE];

// After the debate, Epicurus softens to CONDITIONAL (Diogenes: "Then don't hide it").
const EPICURUS_REVISED = score("epicurus", {
  "personal-1": ["GO", "Two free hours a day is a garden."],
  "personal-2": ["CONDITIONAL", "Said aloud, it weighs nothing.", "Tell your team you use it"],
  "personal-3": ["GO", "Only if you'd say it aloud, and you would."],
});
const FIRST_REVISED: GateThinkerScore[] = FIRST.map((s) => (s.thinkerId === "epicurus" ? EPICURUS_REVISED : s));

// --- Re-run: "What if my company already allows it, and my boss uses it too?"
const RERUN: GateThinkerScore[] = [
  score("hypatia", {
    "finance-1": ["GO", "Your company has already run the experiment."],
    "finance-2": ["CONDITIONAL", "Still: read before you send.", "Read every line before it goes out"],
    "finance-3": ["GO", "Measure your own errors anyway."],
  }),
  HERACLITUS,
  score("diogenes", {
    "market-1": ["GO", "Your voice is in what you choose to say."],
    "market-2": ["GO", "Your boss writes with it; so can you."],
    "market-3": ["GO", "Nothing left to confess."],
  }),
  score("epicurus", {
    "personal-1": ["GO", "More time in the garden."],
    "personal-2": ["GO", "Nothing to hide, nothing to fear."],
    "personal-3": ["GO", "Your boss already said it for you."],
  }),
  score("aristotle", {
    "longterm-1": ["CONDITIONAL", "Keep the muscle.", "Write one important email a day yourself"],
    "longterm-2": ["GO", "A good habit, shared by your company."],
    "longterm-3": ["GO", "Your voice stays yours."],
  }),
];

function resultFor(id: string, scores: GateThinkerScore[], extra: Partial<VoteResult> = {}): VoteResult {
  return {
    id,
    framework: "gate",
    createdAt: Date.now(),
    trigger: "vote",
    setup: DEMO_SETUP,
    scores,
    abstained: [],
    changes: [],
    pollLines: [],
    computed: computeGate(DEMO_SETUP, scores),
    ...extra,
  };
}

const WHAT_IF = "What if my company already allows it, and my boss uses it too?";

export function demoScript(): DemoStep[] {
  const v1 = "demo-vote-1";
  const v2 = "demo-vote-2";
  const first = resultFor(v1, FIRST_REVISED, {
    changes: [
      {
        thinkerId: "epicurus",
        what: LABELS.personal[1],
        from: "NO-GO",
        to: "CONDITIONAL",
        because: "Diogenes is right: shame needs a secret. Said aloud at Monday's meeting, it weighs nothing.",
      },
    ],
  });
  const second = resultFor(v2, RERUN, { trigger: "rerun", whatIf: WHAT_IF, previousResultId: v1 });

  return [
    { kind: "wait", ms: 900 },
    { kind: "type", text: "I spend about two hours a day on email. My company has no rule about AI yet." },
    { kind: "events", events: [{ type: "plan", speakers: ["hypatia", "diogenes"], decisionDetected: true, suggestedFramework: "gate" }] },
    { kind: "events", events: [{ type: "facts", facts: ["2 hours a day on email", "no company rule on AI yet"] }] },
    { kind: "events", events: [{ type: "focus", text: "Is it cheating if the words aren't yours, but the meaning is?" }] },
    {
      kind: "speak",
      speakerId: "hypatia",
      text: "Let us measure before we moralise. Two hours a day is ten hours a week. Draft with the machine for one week, read every line before it leaves, and count the hours you get back and the replies that go wrong. If fewer than one in fifty go wrong, you have your answer.",
    },
    {
      kind: "speak",
      speakerId: "diogenes",
      replyTo: "hypatia",
      text: "Hypatia counts hours; I ask who you're performing for. Most work email is a ritual of polite nothing. Let the machine write the nothing. The real cheat is pretending you care about circling back.",
    },
    { kind: "wait", ms: 900 },
    { kind: "type", text: "@Epicurus what would you do?", tag: "epicurus" },
    { kind: "events", events: [{ type: "plan", speakers: ["epicurus", "heraclitus"], decisionDetected: true, suggestedFramework: "gate" }] },
    {
      kind: "speak",
      speakerId: "epicurus",
      text: "I'd let it write the dull ones, friend, and keep the warm ones for my own hand. What would trouble me is the hiding: waiting to be caught. A pleasure you must hide is not a pleasure. Tell your team, then spend the two free hours with people you like.",
    },
    {
      kind: "speak",
      speakerId: "heraclitus",
      replyTo: "epicurus",
      text: "Epicurus fears being caught; I fear standing still. Writing changed when we carved stone, and again with ink on papyrus. Now it changes again. The only cheat is pretending you still write every word by hand.",
    },
    { kind: "wait", ms: 1000 },
    {
      kind: "summary",
      summary: {
        agree: ["Let it draft the routine emails; write the delicate ones yourself.", "Read every line before it goes out."],
        disagree: ["Epicurus wants you to tell your team first; Heraclitus says just start.", "Hypatia wants a week of measuring; Diogenes says most email is ritual anyway."],
        unknown: ["Would your boss mind if you told them?", "Which emails could hurt you if they went wrong?"],
      },
    },
    { kind: "wait", ms: 2400 },
    { kind: "vote", resultId: v1, initial: FIRST },
    {
      kind: "speak",
      resultId: v1,
      speakerId: "epicurus",
      text: "Diogenes, a secret is a stone in the shoe. I am a no while you would have to hide it.",
    },
    {
      kind: "speak",
      resultId: v1,
      speakerId: "diogenes",
      replyTo: "epicurus",
      text: "Then don't hide it. Say it at Monday's meeting. Shame needs a secret to live.",
    },
    {
      kind: "speak",
      resultId: v1,
      speakerId: "epicurus",
      text: "Said aloud, it weighs nothing. I change my vote: yes, if you tell them.",
    },
    { kind: "revise", resultId: v1, score: EPICURUS_REVISED, changes: first.changes },
    {
      kind: "poll",
      resultId: v1,
      setup: DEMO_SETUP,
      scores: FIRST_REVISED,
      lines: [
        { thinkerId: "aristotle", text: "Yes, if the important ones stay in your own words." },
        { thinkerId: "diogenes", text: "Yes, if you write the delicate ones yourself." },
        { thinkerId: "epicurus", text: "Yes, if you tell your team." },
        { thinkerId: "heraclitus", text: "Yes. The river has moved." },
        { thinkerId: "hypatia", text: "Yes, if you read every line and count for a week." },
      ],
    },
    { kind: "result", result: first },
    { kind: "wait", ms: 7000 },
    { kind: "vote", resultId: v2, whatIf: WHAT_IF, initial: RERUN },
    {
      kind: "speak",
      resultId: v2,
      speakerId: "hypatia",
      text: "Then your company has already run the experiment. Read before you send, and measure your own errors anyway.",
    },
    {
      kind: "speak",
      resultId: v2,
      speakerId: "diogenes",
      text: "Your boss too? Then the only cheat left is pretending you don't.",
    },
    {
      kind: "poll",
      resultId: v2,
      setup: DEMO_SETUP,
      scores: RERUN,
      lines: [
        { thinkerId: "aristotle", text: "Yes, if you still write one a day yourself." },
        { thinkerId: "diogenes", text: "Yes. Nothing left to confess." },
        { thinkerId: "epicurus", text: "Yes. Nothing to hide, nothing to fear." },
        { thinkerId: "heraclitus", text: "Yes. Step in." },
        { thinkerId: "hypatia", text: "Yes, if you read before you send." },
      ],
    },
    { kind: "result", result: second },
  ];
}

/** Vote tags for a scripted score, for the "score" events. */
export function demoTag(s: GateThinkerScore) {
  return thinkerVote(DEMO_SETUP, s);
}
export const DEMO_SCORES = { first: FIRST, firstRevised: FIRST_REVISED, rerun: RERUN };
