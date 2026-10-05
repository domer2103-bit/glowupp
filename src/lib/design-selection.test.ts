import { describe, it, expect } from "vitest";
import { conceptsToShow, getChosenConcept, photosNeedingDesign } from "./design-selection";

const c = (id: string, styleKey: string | null, over: Partial<{ selectedByUser: boolean; status: string; sourcePhotoId: string }> = {}) => ({
  id,
  styleKey,
  selectedByUser: false,
  status: "COMPLETE",
  sourcePhotoId: "photoA",
  ...over,
});

describe("conceptsToShow", () => {
  const batch = [c("1", "contemporary"), c("2", "traditional", { selectedByUser: true }), c("3", "bold")];

  it("shows every option until one is chosen", () => {
    expect(conceptsToShow([c("1", "contemporary"), c("2", "bold")]).map((x) => x.id)).toEqual(["1", "2"]);
  });

  it("keeps only the chosen style once one is picked", () => {
    expect(conceptsToShow(batch).map((x) => x.id)).toEqual(["2"]);
  });

  it("keeps the chosen style on other photos and its refinements, hides rejected styles", () => {
    const all = [...batch, c("4", "traditional", { sourcePhotoId: "photoB" }), c("5", "bold", { sourcePhotoId: "photoB" })];
    expect(conceptsToShow(all).map((x) => x.id)).toEqual(["2", "4"]);
  });

  it("shows everything again when asked", () => {
    expect(conceptsToShow(batch, { showAll: true })).toHaveLength(3);
  });

  it("shows just the pick when it has no style key", () => {
    const legacy = [c("1", null, { selectedByUser: true }), c("2", null), c("3", "bold")];
    expect(conceptsToShow(legacy).map((x) => x.id)).toEqual(["1"]);
  });
});

describe("getChosenConcept", () => {
  it("returns undefined when nothing is chosen", () => {
    expect(getChosenConcept([c("1", "bold")])).toBeUndefined();
  });
});

describe("photosNeedingDesign", () => {
  const photos = [{ id: "photoA" }, { id: "photoB" }, { id: "photoC" }];
  const chosen = c("2", "traditional", { selectedByUser: true });

  it("returns the photos other than the source with no concept in the chosen style", () => {
    expect(photosNeedingDesign(photos, [chosen], chosen).map((p) => p.id)).toEqual(["photoB", "photoC"]);
  });

  it("skips photos already designed in the chosen style", () => {
    const done = c("4", "traditional", { sourcePhotoId: "photoB" });
    expect(photosNeedingDesign(photos, [chosen, done], chosen).map((p) => p.id)).toEqual(["photoC"]);
  });

  it("retries photos whose previous attempt failed", () => {
    const failed = c("4", "traditional", { sourcePhotoId: "photoB", status: "FAILED" });
    expect(photosNeedingDesign(photos, [chosen, failed], chosen).map((p) => p.id)).toEqual(["photoB", "photoC"]);
  });

  it("is not satisfied by a different style on the same photo", () => {
    const other = c("4", "bold", { sourcePhotoId: "photoB" });
    expect(photosNeedingDesign(photos, [chosen, other], chosen).map((p) => p.id)).toEqual(["photoB", "photoC"]);
  });
});
