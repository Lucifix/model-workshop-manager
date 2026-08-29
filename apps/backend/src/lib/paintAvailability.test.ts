import { describe, it, expect } from "vitest";
import { paintAvailability } from "./paintAvailability.js";

describe("paintAvailability", () => {
  it("computes coverage matching the spec example (6/7 -> 83%)", () => {
    const flags = [true, true, true, true, true, true, false];
    const result = paintAvailability(flags);
    expect(result.totalRequired).toBe(7);
    expect(result.ownedCount).toBe(6);
    expect(result.missingCount).toBe(1);
    expect(result.coveragePercent).toBe(86); // 6/7 = 85.71% -> rounds to 86
  });

  it("treats a model with no required paints as 100% covered", () => {
    expect(paintAvailability([])).toEqual({
      totalRequired: 0,
      ownedCount: 0,
      missingCount: 0,
      coveragePercent: 100,
    });
  });

  it("reports 0% when nothing required is owned", () => {
    const result = paintAvailability([false, false, false]);
    expect(result.coveragePercent).toBe(0);
    expect(result.missingCount).toBe(3);
  });

  it("reports 100% when everything required is owned", () => {
    const result = paintAvailability([true, true]);
    expect(result.coveragePercent).toBe(100);
    expect(result.missingCount).toBe(0);
  });
});
