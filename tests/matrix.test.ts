import { describe, expect, it } from "vitest";
import { computeMatrix } from "@/lib/frameworks/matrix";
import type { MatrixSetup, MatrixThinkerScore, ThinkerId } from "@/lib/types";

const setup: MatrixSetup = {
  framework: "matrix",
  options: [
    { id: "lisbon", label: "Lisbon" },
    { id: "berlin", label: "Berlin" },
  ],
  criteria: [
    { id: "pay", label: "Pay", weight: 3 },
    { id: "life", label: "Quality of life", weight: 3 },
  ],
};

function s(thinkerId: ThinkerId, grid: Record<string, [number, number]>): MatrixThinkerScore {
  return {
    framework: "matrix",
    thinkerId,
    cells: Object.entries(grid).flatMap(([optionId, [pay, life]]) => [
      { optionId, criterionId: "pay", score: pay, reason: "" },
      { optionId, criterionId: "life", score: life, reason: "" },
    ]),
  };
}

describe("computeMatrix", () => {
  it("averages cells, weights totals and ranks", () => {
    const r = computeMatrix(setup, [s("pythagoras", { lisbon: [2, 5], berlin: [4, 3] }), s("diogenes", { lisbon: [2, 5], berlin: [4, 3] })]);
    // Lisbon: 2*3 + 5*3 = 21; Berlin: 4*3 + 3*3 = 21 → tie broken by label (Berlin first)
    expect(r.ranking.map((x) => x.total)).toEqual([21, 21]);
    expect(r.ranking[0].label).toBe("Berlin");
  });

  it("finds the decisive criterion and a flip in the sensitivity line", () => {
    const r = computeMatrix(setup, [s("pythagoras", { lisbon: [2, 5], berlin: [4, 2] })]);
    // Lisbon 21 vs Berlin 18 → Lisbon wins on quality of life.
    expect(r.ranking[0].label).toBe("Lisbon");
    expect(r.decisiveCriterionId).toBe("life");
    // Life −1: Lisbon 2*3+5*2=16, Berlin 4*3+2*2=16, a tie, which sorts Berlin first by label.
    expect(r.sensitivity).toBe("If “Quality of life” mattered one point less, Berlin would win.");
  });

  it("says the ranking holds when no single-point move flips it", () => {
    const r = computeMatrix(setup, [s("pythagoras", { lisbon: [5, 5], berlin: [1, 1] })]);
    expect(r.sensitivity).toBe("The ranking holds if any single weight moves by one point.");
  });

  it("marks contested cells and tallies each thinker's own winner", () => {
    const r = computeMatrix(setup, [
      s("pythagoras", { lisbon: [1, 5], berlin: [5, 2] }),
      s("heraclitus", { lisbon: [4, 5], berlin: [2, 2] }),
      s("epicurus", { lisbon: [3, 5], berlin: [3, 2] }),
    ]);
    const pay = r.cells.find((c) => c.optionId === "lisbon" && c.criterionId === "pay")!;
    expect(pay.spread).toBe(3);
    expect(pay.contested).toBe(true);
    expect(r.cells.find((c) => c.optionId === "lisbon" && c.criterionId === "life")!.contested).toBe(false);
    expect(r.thinkerVotes.find((v) => v.thinkerId === "pythagoras")!.vote).toBe("Berlin");
    expect(r.ranking[0].label).toBe("Lisbon");
    expect(r.tally).toEqual({ for: 2, against: 1, abstained: 0 });
  });

  it("leaves abstained thinkers out of the averages", () => {
    const r = computeMatrix(setup, [s("pythagoras", { lisbon: [5, 5], berlin: [1, 1] }), s("heraclitus", { lisbon: [1, 1], berlin: [5, 5] })], ["heraclitus"]);
    expect(r.ranking[0].label).toBe("Lisbon");
    expect(r.tally.abstained).toBe(1);
    expect(r.thinkerVotes.find((v) => v.thinkerId === "heraclitus")!.vote).toBe("ABSTAIN");
  });
});
