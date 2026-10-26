import { describe, expect, it } from "vitest";
import { EXAMPLE_POOL, pickExamples, suggestTable } from "@/config/questions";

describe("suggestTable", () => {
  it("suggests thinkers for money and work questions", () => {
    const s = suggestTable("Should I lend my brother €3,000 for his startup?");
    expect(s?.ids).toContain("pythagoras");
    expect(s?.ids.length).toBeLessThanOrEqual(3);
  });
  it("returns null when nothing matches", () => {
    expect(suggestTable("Hmm?")).toBeNull();
  });
});

describe("pickExamples", () => {
  it("picks one question of each kind", () => {
    const [a, b, c] = pickExamples();
    expect(EXAMPLE_POOL.yesno).toContain(a);
    expect(EXAMPLE_POOL.choice).toContain(b);
    expect(EXAMPLE_POOL.decided).toContain(c);
  });
});
