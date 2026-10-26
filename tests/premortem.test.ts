import { describe, expect, it } from "vitest";
import { causesFrom, computePremortem } from "@/lib/frameworks/premortem";
import type { PremortemThinkerScore, ThinkerId } from "@/lib/types";

const IDS: ThinkerId[] = ["hypatia", "heraclitus", "thucydides", "epictetus", "aristotle", "epicurus"];

function withCauses(): PremortemThinkerScore[] {
  return IDS.map((id) => ({
    framework: "premortem",
    thinkerId: id,
    cause: { cause: `${id} failure`, warningSign: `${id} sign`, mitigation: `${id} fix` },
  }));
}

/** Everyone gives the same rating to each cause: [likelihood, damage, mitigation]. */
function rated(base: PremortemThinkerScore[], table: Record<string, [number, number, number]>): PremortemThinkerScore[] {
  return base.map((s) => ({
    ...s,
    ratings: Object.entries(table).map(([causeId, [likelihood, damage, mitigationCredible]]) => ({ causeId, likelihood, damage, mitigationCredible })),
  }));
}

const LOW: [number, number, number] = [2, 2, 4];

describe("computePremortem", () => {
  const base = withCauses();
  const causes = causesFrom(base);

  it("ranks by likelihood × damage and keeps the top 5", () => {
    const r = computePremortem(
      causes,
      rated(base, {
        "cause-hypatia": [3, 3, 4],
        "cause-heraclitus": [5, 2, 4],
        "cause-thucydides": [2, 2, 4],
        "cause-epictetus": [4, 3, 4],
        "cause-aristotle": [1, 1, 4],
        "cause-epicurus": [3, 4, 4],
      }),
    );
    expect(r.ranked.map((x) => x.id)).toEqual(["cause-epictetus", "cause-epicurus", "cause-heraclitus", "cause-hypatia", "cause-thucydides"]);
    expect(r.ranked[0].risk).toBe(12);
    expect(r.warningChecklist[0]).toBe("epictetus sign");
  });

  it("proceeds when nothing is critical", () => {
    const r = computePremortem(causes, rated(base, Object.fromEntries(causes.map((c) => [c.id, LOW]))));
    expect(r.call).toBe("proceed");
    expect(r.tally.for).toBe(6);
  });

  it("one ≥4/≥4 cause without credible mitigation → revise; a credible mitigation keeps it proceed", () => {
    const table = Object.fromEntries(causes.map((c) => [c.id, LOW]));
    expect(computePremortem(causes, rated(base, { ...table, "cause-heraclitus": [4, 5, 2] })).call).toBe("revise");
    expect(computePremortem(causes, rated(base, { ...table, "cause-heraclitus": [4, 5, 3] })).call).toBe("proceed");
  });

  it("two critical causes → stop", () => {
    const table = Object.fromEntries(causes.map((c) => [c.id, LOW]));
    const r = computePremortem(causes, rated(base, { ...table, "cause-heraclitus": [5, 5, 1], "cause-hypatia": [4, 4, 2] }));
    expect(r.call).toBe("stop");
    expect(r.ranked.filter((x) => x.critical)).toHaveLength(2);
    expect(r.thinkerVotes.every((v) => v.vote === "STOP")).toBe(true);
  });
});

describe("premortem trace", () => {
  it("states the critical count and the resulting call", () => {
    const base = withCauses();
    const causes = causesFrom(base);
    const table = Object.fromEntries(causes.map((c) => [c.id, LOW]));
    const r = computePremortem(causes, rated(base, { ...table, "cause-heraclitus": [4, 5, 2] }));
    expect(r.trace.at(-1)).toBe("One critical risk, so: rethink it first.");
  });
});
