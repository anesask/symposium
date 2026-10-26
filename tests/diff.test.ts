import { describe, expect, it } from "vitest";
import { compareResults } from "@/lib/frameworks/diff";
import { computeMatrix } from "@/lib/frameworks/matrix";
import { computePremortem } from "@/lib/frameworks/premortem";
import { demoScript } from "@/lib/demo/script";
import type { MatrixSetup, PremortemCause, VoteResult } from "@/lib/types";

const results = demoScript().flatMap((s) => (s.kind === "result" ? [s.result] : []));

function wrap(framework: VoteResult["framework"], computed: VoteResult["computed"], id: string): VoteResult {
  return { id, framework, computed, createdAt: 0, trigger: "vote", setup: { framework: "premortem", premise: "", plan: "" }, scores: [], abstained: [], changes: [], pollLines: [] };
}

describe("compareResults", () => {
  it("gate: tells GO, IF → GO and which criteria flipped", () => {
    const d = compareResults(results[0], results[1])!;
    expect(d.was).toBe("GO, IF");
    expect(d.now).toBe("GO");
    expect(d.changed).toBe(true);
    expect(d.flips).toContain("The time saved is real, not imagined: Maybe → Yes");
  });

  it("matrix: a new winner and the rank moves", () => {
    const setup: MatrixSetup = {
      framework: "matrix",
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      criteria: [{ id: "x", label: "X", weight: 3 }],
    };
    const mk = (a: number, b: number) =>
      computeMatrix(setup, [{ framework: "matrix", thinkerId: "pythagoras", cells: [{ optionId: "a", criterionId: "x", score: a, reason: "" }, { optionId: "b", criterionId: "x", score: b, reason: "" }] }]);
    const d = compareResults(wrap("matrix", mk(5, 2), "1"), wrap("matrix", mk(2, 4), "2"))!;
    expect(d).toMatchObject({ was: "A", now: "B", changed: true });
    expect(d.flips[0]).toBe("B: #2 → #1 (40% → 80%)");
  });

  it("premortem: call and critical-risk count", () => {
    const causes: PremortemCause[] = [{ id: "c1", thinkerId: "heraclitus", cause: "No users", warningSign: "", mitigation: "" }];
    const mk = (l: number, m: number) => computePremortem(causes, [{ framework: "premortem", thinkerId: "heraclitus", ratings: [{ causeId: "c1", likelihood: l, damage: 5, mitigationCredible: m }] }]);
    const d = compareResults(wrap("premortem", mk(5, 1), "1"), wrap("premortem", mk(5, 4), "2"))!;
    expect(d).toMatchObject({ was: "REVISE", now: "PROCEED", changed: true });
    expect(d.flips).toContain("Critical risks: 1 → 0");
  });

  it("returns null across frameworks", () => {
    expect(compareResults(results[0], wrap("premortem", results[0].computed, "x"))).toBeNull();
  });
});
