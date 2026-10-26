import type { GateCriterion, Station, ThinkerId } from "@/lib/types";

export const STATION_LABELS: Record<Station, string> = {
  finance: "Finance",
  risk: "Risk",
  market: "Market",
  personal: "Personal",
  longterm: "Long-term",
};

/** Default criteria per station. The orchestrator rewrites the labels for the specific decision. */
export const DEFAULT_CRITERIA: Record<Station, GateCriterion[]> = {
  finance: [
    { id: "finance-1", label: "Runway covers the downside", mustPass: true },
    { id: "finance-2", label: "Debt and fixed costs are manageable", mustPass: false },
    { id: "finance-3", label: "Income timing is realistic", mustPass: false },
  ],
  risk: [
    { id: "risk-1", label: "Worst case is survivable", mustPass: true },
    { id: "risk-2", label: "There is a way back if it fails", mustPass: false },
    { id: "risk-3", label: "Upside is worth the variance", mustPass: false },
  ],
  market: [
    { id: "market-1", label: "Someone will actually pay / want this", mustPass: false },
    { id: "market-2", label: "Offer is focused, not everything to everyone", mustPass: false },
    { id: "market-3", label: "Timing is right", mustPass: false },
  ],
  personal: [
    { id: "personal-1", label: "Fits who you want to become", mustPass: false },
    { id: "personal-2", label: "Your health, sleep and people survive it", mustPass: true },
    { id: "personal-3", label: "You won't regret not trying", mustPass: false },
  ],
  longterm: [
    { id: "longterm-1", label: "Serves your purpose in 5 years", mustPass: false },
    { id: "longterm-2", label: "Builds skills or assets that compound", mustPass: false },
    { id: "longterm-3", label: "Keeps future options open", mustPass: false },
  ],
};

/**
 * Who covers an unowned station, in order of preference ("closest thinker").
 * Anyone not listed is a last resort.
 */
export const COVER_PREFERENCE: Record<Station, ThinkerId[]> = {
  finance: ["pythagoras", "thucydides", "epicurus", "aristotle", "hypatia", "epictetus", "diogenes", "heraclitus", "plato"],
  risk: ["heraclitus", "hypatia", "thucydides", "epictetus", "pythagoras", "aristotle", "diogenes", "epicurus", "plato"],
  market: ["thucydides", "diogenes", "hypatia", "heraclitus", "pythagoras", "aristotle", "plato", "epicurus", "epictetus"],
  personal: ["epictetus", "epicurus", "plato", "diogenes", "aristotle", "hypatia", "heraclitus", "thucydides", "pythagoras"],
  longterm: ["aristotle", "plato", "heraclitus", "epictetus", "hypatia", "thucydides", "pythagoras", "epicurus", "diogenes"],
};
