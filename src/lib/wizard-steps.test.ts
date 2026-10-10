import { describe, expect, it } from "vitest";
import { WIZARD_STEPS, canAdvance, canGenerate, clampStep, startingStep, stepLabel } from "./wizard-steps";

describe("wizard steps", () => {
  it("asks in the order: photo, what to change, style, colours, budget", () => {
    expect(WIZARD_STEPS.map((s) => s.key)).toEqual(["photo", "changes", "style", "colours", "budget"]);
  });

  it("only the photo and the style are required; the rest can be skipped", () => {
    expect(WIZARD_STEPS.filter((s) => !s.optional).map((s) => s.key)).toEqual(["photo", "style"]);
  });

  it("will not leave the photo step without a photo, or the style step without a style", () => {
    expect(canAdvance("photo", { photoCount: 0, style: "Modern" })).toBe(false);
    expect(canAdvance("photo", { photoCount: 1, style: "" })).toBe(true);
    expect(canAdvance("style", { photoCount: 1, style: "" })).toBe(false);
    expect(canAdvance("style", { photoCount: 1, style: "   " })).toBe(false);
    expect(canAdvance("style", { photoCount: 0, style: "Modern" })).toBe(true);
    for (const key of ["changes", "colours", "budget"] as const) expect(canAdvance(key, { photoCount: 0, style: "" })).toBe(true);
  });

  it("can generate only with a photo and a style", () => {
    expect(canGenerate({ photoCount: 1, style: "Modern" })).toBe(true);
    expect(canGenerate({ photoCount: 0, style: "Modern" })).toBe(false);
    expect(canGenerate({ photoCount: 1, style: "" })).toBe(false);
  });

  it("opens at the first question after the photo for someone who already has one", () => {
    expect(startingStep({ photoCount: 0, style: "" })).toBe(0);
    expect(startingStep({ photoCount: 2, style: "" })).toBe(1);
  });

  it("keeps the step number in range and labels it", () => {
    expect(clampStep(-3)).toBe(0);
    expect(clampStep(99)).toBe(4);
    expect(stepLabel(0)).toBe("Step 1 of 5");
    expect(stepLabel(4)).toBe("Step 5 of 5");
    expect(stepLabel(42)).toBe("Step 5 of 5");
  });
});
