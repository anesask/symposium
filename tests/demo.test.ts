import { describe, expect, it } from "vitest";
import { computeGate } from "@/lib/frameworks/gate";
import { DEMO_SCORES, DEMO_SETUP, demoScript } from "@/lib/demo/script";
import type { GateComputed, VoteResult } from "@/lib/types";

describe("demo script", () => {
  const results = demoScript().flatMap((s) => (s.kind === "result" ? [s.result] : [])) as VoteResult[];

  it("has a first vote and a re-run", () => {
    expect(results).toHaveLength(2);
    expect(results[1].trigger).toBe("rerun");
    expect(results[1].previousResultId).toBe(results[0].id);
  });

  it("computes its verdicts with the real gate code (no faked kernel)", () => {
    expect(results[0].computed).toEqual(computeGate(DEMO_SETUP, DEMO_SCORES.firstRevised));
    expect(results[1].computed).toEqual(computeGate(DEMO_SETUP, DEMO_SCORES.rerun));
  });

  it("tells the story: NO-GO before the debate, GO, IF after it, GO once the company allows it", () => {
    expect(computeGate(DEMO_SETUP, DEMO_SCORES.first).verdict).toBe("NO-GO");
    expect((results[0].computed as GateComputed).verdict).toBe("GO, IF");
    expect((results[1].computed as GateComputed).verdict).toBe("GO");
  });
});

describe("demo verdict", () => {
  it("lists 3 to 5 distinct conditions", () => {
    const first = demoScript().flatMap((s) => (s.kind === "result" ? [s.result] : []))[0].computed as GateComputed;
    expect(first.conditions.length).toBeGreaterThanOrEqual(3);
    expect(first.conditions.length).toBeLessThanOrEqual(5);
    expect(first.conditions).toContain("Tell your team you use it");
  });
});
