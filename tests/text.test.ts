import { describe, expect, it } from "vitest";
import { stripDashes, stripDashesDeep } from "@/lib/text";

describe("stripDashes", () => {
  it("turns ranges into hyphens and other long dashes into commas", () => {
    expect(stripDashes("Save 3\u20136 months \u2014 then quit.")).toBe("Save 3-6 months, then quit.");
    expect(stripDashes("Not yet\u2014.")).toBe("Not yet.");
    expect(stripDashes("plain text")).toBe("plain text");
  });

  it("cleans nested values", () => {
    expect(stripDashesDeep({ a: ["x \u2014 y"], n: 2 })).toEqual({ a: ["x, y"], n: 2 });
  });
});
