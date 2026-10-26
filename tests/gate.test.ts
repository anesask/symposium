import { describe, expect, it } from "vitest";
import { assignStations, computeGate, dedupe, defaultGateSetup, thinkerVote } from "@/lib/frameworks/gate";
import type { GateSetup, GateThinkerScore, GateVote, Station, ThinkerId } from "@/lib/types";

const TABLE: ThinkerId[] = ["aristotle", "diogenes", "epicurus", "heraclitus", "pythagoras"];

/** Every owner votes `vote` on every criterion, with overrides by criterion id. */
function scoresFor(setup: GateSetup, vote: GateVote, overrides: Record<string, GateVote> = {}): GateThinkerScore[] {
  const byOwner = new Map<ThinkerId, GateThinkerScore>();
  for (const st of setup.stations) {
    const s = byOwner.get(st.ownerId) ?? { framework: "gate" as const, thinkerId: st.ownerId, stations: [] };
    s.stations.push({
      station: st.station,
      votes: st.criteria.map((c) => {
        const v = overrides[c.id] ?? vote;
        return { criterionId: c.id, vote: v, reason: `${c.id} ${v}`, condition: v === "GO" ? undefined : `fix ${c.id}` };
      }),
    });
    byOwner.set(st.ownerId, s);
  }
  return [...byOwner.values()];
}

describe("assignStations", () => {
  it("gives the default table one station each, natives owning their own and Diogenes covering Market", () => {
    const a = assignStations(TABLE);
    const owner = Object.fromEntries(a.map((x) => [x.station, x]));
    expect(owner.finance).toMatchObject({ ownerId: "pythagoras", covering: false });
    expect(owner.risk).toMatchObject({ ownerId: "heraclitus", covering: false });
    expect(owner.market).toMatchObject({ ownerId: "diogenes", covering: true });
    expect(owner.personal).toMatchObject({ ownerId: "epicurus", covering: false });
    expect(owner.longterm).toMatchObject({ ownerId: "aristotle", covering: false });
    expect(new Set(a.map((x) => x.ownerId)).size).toBe(5);
  });

  it("lets Epictetus own Personal over Plato and Epicurus, who cover elsewhere", () => {
    const seats: ThinkerId[] = ["aristotle", "plato", "epictetus", "epicurus"];
    const a = assignStations(seats);
    const owner = Object.fromEntries(a.map((x) => [x.station, x]));
    expect(owner.personal.ownerId).toBe("epictetus");
    expect(owner.longterm).toMatchObject({ ownerId: "aristotle", covering: false });
    expect(owner.finance).toMatchObject({ ownerId: "epicurus", covering: true });
    expect(a.every((x) => seats.includes(x.ownerId))).toBe(true);
  });

  it("covers every station with only 3 seats", () => {
    const a = assignStations(["hypatia", "thucydides", "plato"]);
    expect(a).toHaveLength(5);
    const loads = a.reduce<Record<string, number>>((m, x) => ((m[x.ownerId] = (m[x.ownerId] ?? 0) + 1), m), {});
    expect(Math.max(...Object.values(loads)) - Math.min(...Object.values(loads))).toBeLessThanOrEqual(1);
  });
});

describe("computeGate verdict rule", () => {
  const setup = defaultGateSetup(TABLE);

  it("all GO is GO, 5 to 0", () => {
    const r = computeGate(setup, scoresFor(setup, "GO"));
    expect(r.verdict).toBe("GO");
    expect(r.tally).toEqual({ for: 5, against: 0, abstained: 0 });
    expect(r.conditions).toEqual([]);
  });

  it("any NO-GO on a mustPass criterion is NO-GO with that flip condition", () => {
    const r = computeGate(setup, scoresFor(setup, "GO", { "finance-1": "NO-GO" }));
    expect(r.verdict).toBe("NO-GO");
    expect(r.flipCondition).toBe("fix finance-1");
    expect(r.thinkerVotes.find((v) => v.thinkerId === "pythagoras")?.vote).toBe("NO-GO");
  });

  it("a NO-GO on a non-mustPass criterion doesn't block", () => {
    const r = computeGate(setup, scoresFor(setup, "GO", { "market-1": "NO-GO" }));
    expect(r.verdict).toBe("GO"); // 14/15 GO
    expect(r.openRisks).toContain("market-1 NO-GO");
  });

  it("at least 60% GO is GO; below is GO, IF with conditions as lines", () => {
    // 15 criteria: 9 GO = 60% exactly → GO
    const six: Record<string, GateVote> = {};
    ["finance-2", "finance-3", "risk-2", "risk-3", "market-1", "market-2"].forEach((id) => (six[id] = "CONDITIONAL"));
    expect(computeGate(setup, scoresFor(setup, "GO", six)).verdict).toBe("GO");
    // 7 conditional → 8/15 GO = 53% → GO, IF
    const seven = { ...six, "market-3": "CONDITIONAL" as const };
    const r = computeGate(setup, scoresFor(setup, "GO", seven));
    expect(r.verdict).toBe("GO, IF");
    expect(r.conditions.length).toBe(5); // capped
    expect(r.conditions[0]).toBe("fix finance-2");
  });

  it("mustPass conditionals come first in the conditions list", () => {
    const r = computeGate(setup, scoresFor(setup, "GO", { "market-2": "CONDITIONAL", "personal-2": "CONDITIONAL" }));
    expect(r.conditions[0]).toBe("fix personal-2");
  });

  it("an abstained seat is left out of the count and flagged", () => {
    const scores = scoresFor(setup, "GO").filter((s) => s.thinkerId !== "diogenes");
    const r = computeGate(setup, scores, ["diogenes"]);
    expect(r.verdict).toBe("GO");
    expect(r.tally).toEqual({ for: 4, against: 0, abstained: 1 });
    expect(r.scorecard.find((s) => s.station === "market")?.status).toBe("ABSTAIN");
    expect(r.openRisks.some((x) => x.includes("Diogenes abstained"))).toBe(true);
  });

  it("scorecard status shows the worst vote in a station", () => {
    const r = computeGate(setup, scoresFor(setup, "GO", { "risk-3": "CONDITIONAL" }));
    const status = Object.fromEntries(r.scorecard.map((s) => [s.station, s.status])) as Record<Station, string>;
    expect(status.risk).toBe("CONDITIONAL");
    expect(status.finance).toBe("GO");
  });
});

describe("thinkerVote", () => {
  const setup = defaultGateSetup(TABLE);
  it("is GO, IF when a thinker has a conditional, NO-GO when they block a mustPass", () => {
    const scores = scoresFor(setup, "GO", { "risk-2": "CONDITIONAL", "finance-1": "NO-GO" });
    expect(thinkerVote(setup, scores.find((s) => s.thinkerId === "heraclitus"))).toBe("GO, IF");
    expect(thinkerVote(setup, scores.find((s) => s.thinkerId === "pythagoras"))).toBe("NO-GO");
    expect(thinkerVote(setup, undefined)).toBe("ABSTAIN");
  });
});


describe("dedupe", () => {
  it("drops near-duplicate conditions but keeps different ones", () => {
    expect(
      dedupe(["Get a signed contract and deposit", "Sign contract and collect a deposit", "Build a 3-month cash runway", "Maintain an active job search network"]),
    ).toEqual(["Get a signed contract and deposit", "Build a 3-month cash runway", "Maintain an active job search network"]);
  });
});

describe("trace (How this was decided)", () => {
  const setup = defaultGateSetup(TABLE);
  it("names the blocking must-pass criterion", () => {
    const r = computeGate(setup, scoresFor(setup, "GO", { "finance-1": "NO-GO", "market-1": "CONDITIONAL" }));
    expect(r.trace).toEqual([
      "They answered 15 questions: 13 clear yes, 1 yes with a condition, 1 no.",
      "“Runway covers the downside” is a must-have, and it got a no. That alone means: not yet.",
    ]);
  });
  it("shows the Go share against the 60% bar", () => {
    const r = computeGate(setup, scoresFor(setup, "CONDITIONAL", { "finance-1": "GO", "risk-1": "GO" }));
    expect(r.trace.at(-1)).toBe("13% were a clear yes. That's under 60%, so: yes, if the conditions are met.");
    expect(r.trace[1]).toBe("None of the must-haves got a no.");
  });
});

describe("thinkerVote fairness", () => {
  const setup = defaultGateSetup(TABLE);
  it("Conditional + Conditional + a non-must-pass No-go is GO, IF, not NO-GO", () => {
    const diogenes = scoresFor(setup, "GO", { "market-1": "CONDITIONAL", "market-2": "CONDITIONAL", "market-3": "NO-GO" }).find((s) => s.thinkerId === "diogenes");
    expect(thinkerVote(setup, diogenes)).toBe("GO, IF");
  });
  it("two flat No-gos out of three is NO-GO", () => {
    const diogenes = scoresFor(setup, "GO", { "market-1": "NO-GO", "market-2": "NO-GO" }).find((s) => s.thinkerId === "diogenes");
    expect(thinkerVote(setup, diogenes)).toBe("NO-GO");
  });
});
