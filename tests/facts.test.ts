import { describe, expect, it } from "vitest";
import { mergeFacts } from "@/lib/store/reducer";

describe("mergeFacts", () => {
  it("adds new facts, skips repeats regardless of case, and caps the list", () => {
    expect(mergeFacts(["€5,000 saved"], ["€5,000 Saved", " rent is €900 a month ", ""])).toEqual(["€5,000 saved", "rent is €900 a month"]);
    expect(mergeFacts(["rent is €900 a month"], ["rent: €900/month", "€5,000 saved"])).toEqual(["rent is €900 a month", "€5,000 saved"]);
    expect(mergeFacts([], Array.from({ length: 20 }, (_, i) => `fact ${i}`))).toHaveLength(12);
  });
});
