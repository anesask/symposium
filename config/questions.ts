import type { ThinkerId } from "@/lib/types";

// Example questions for the question screen: one of each kind, picked at random from these pools,
// so the chips also teach the three ways to decide.
export const EXAMPLE_POOL = {
  yesno: [
    "Should I quit my job to become a full-time content creator?",
    "Should I use AI to write my work emails, or is that cheating?",
    "Should I move abroad for a remote job that pays 30% more?",
    "Should I start a side hustle on weekends or protect my rest?",
    "Should I lend my brother €3,000 for his startup?",
  ],
  choice: [
    "Delete Instagram, go private, or keep posting?",
    "Rent in the city, buy in the suburbs, or stay with my parents?",
    "Learn to code, learn to work with AI, or go back to university?",
    "Dating apps, a running club, or asking friends to set me up?",
  ],
  decided: [
    "I've decided to move in with my partner after 3 months. What will go wrong?",
    "I've signed up for a marathon in 4 months and I've never run. What will go wrong?",
    "I've decided to take a 6-month sabbatical to travel. What will go wrong?",
    "I'm leaving my agency job to freelance next month. What will go wrong?",
  ],
};

export function pickExamples(): string[] {
  const one = (xs: string[]) => xs[Math.floor(Math.random() * xs.length)];
  return [one(EXAMPLE_POOL.yesno), one(EXAMPLE_POOL.choice), one(EXAMPLE_POOL.decided)];
}

// Who to seat for which kind of question. The first rules that match pick up to three thinkers.
const RULES: { match: RegExp; topic: string; ids: ThinkerId[] }[] = [
  { match: /€|\$|£|money|salary|savings?|invest|rent|debt|loan|lend|income|budget|pay\b|pays\b|price/i, topic: "money", ids: ["pythagoras", "thucydides"] },
  { match: /partner|girlfriend|boyfriend|wife|husband|love|dating|friends?\b|family|brother|sister|parents|wedding|move in/i, topic: "people", ids: ["epicurus", "plato"] },
  { match: /\bjob|career|boss|quit|startup|business|side hustle|promotion|freelanc|agency|work\b/i, topic: "work", ids: ["heraclitus", "thucydides"] },
  { match: /instagram|tiktok|social media|phone|followers|posting|\bai\b|chatgpt|online|app\b|apps\b|content/i, topic: "screens", ids: ["diogenes", "hypatia"] },
  { match: /afraid|fear|worr|anxious|stress|burn ?out|what people think|judge/i, topic: "worry", ids: ["epictetus", "epicurus"] },
  { match: /\brun|marathon|gym|health|sleep|diet|habit/i, topic: "habits", ids: ["aristotle", "epictetus"] },
  { match: /meaning|purpose|happy|happiness|sabbatical|travel/i, topic: "meaning", ids: ["aristotle", "plato"] },
];

/** Thinkers who suit this question, and what kind of question it is; null if nothing matches. */
export function suggestTable(question: string): { topic: string; ids: ThinkerId[] } | null {
  const hits = RULES.filter((r) => r.match.test(question));
  if (!hits.length) return null;
  const ids = [...new Set(hits.flatMap((r) => r.ids))].slice(0, 3);
  return { topic: hits.map((h) => h.topic).slice(0, 2).join(" and "), ids };
}
