import { describe, it, expect } from "vitest";
import { batchPhotoId, chosenDesignGroup, conceptsToShow, getChosenConcept, photosNeedingDesign, styleOptions } from "./design-selection";

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

describe("styleOptions", () => {
  const o = (id: string, version: number, styleKey: string | null, over: Partial<{ status: string; sourcePhotoId: string; description: string | null; selectedByUser: boolean }> = {}) => ({
    id,
    version,
    styleKey,
    selectedByUser: false,
    status: "COMPLETE",
    sourcePhotoId: "photoA",
    description: null as string | null,
    ...over,
  });

  it("gives one card per style, in the order they were made", () => {
    const ids = styleOptions([o("1", 1, "contemporary"), o("2", 2, "traditional"), o("3", 3, "bold")]).map((x) => x.id);
    expect(ids).toEqual(["1", "2", "3"]);
  });

  it("leaves out refinements and designs of other photos", () => {
    const all = [
      o("1", 1, "contemporary"),
      o("2", 2, "traditional"),
      o("3", 3, "traditional", { description: "Refinement of v2: darker worktop" }),
      o("4", 4, "traditional", { sourcePhotoId: "photoB" }),
    ];
    expect(styleOptions(all).map((x) => x.id)).toEqual(["1", "2"]);
  });

  it("prefers the newest usable attempt of a style, and keeps a style that only failed so it can be retried", () => {
    const all = [
      o("1", 1, "contemporary", { status: "FAILED" }),
      o("2", 2, "traditional", { status: "FAILED" }),
      o("3", 3, "contemporary"),
    ];
    expect(styleOptions(all).map((x) => [x.id, x.status])).toEqual([
      ["3", "COMPLETE"],
      ["2", "FAILED"],
    ]);
  });

  it("includes the next batch of different styles after the first", () => {
    const all = [o("1", 1, "contemporary"), o("2", 2, "traditional"), o("3", 3, "bold"), o("4", 4, "scandinavian"), o("5", 5, "industrial")];
    expect(styleOptions(all)).toHaveLength(5);
  });

  it("is empty when nothing has been made", () => {
    expect(styleOptions([])).toEqual([]);
    expect(batchPhotoId([])).toBeUndefined();
  });
});

describe("chosenDesignGroup", () => {
  const g = (id: string, version: number, styleKey: string, sourcePhotoId: string, status = "COMPLETE", selectedByUser = false) => ({
    id,
    version,
    styleKey,
    sourcePhotoId,
    status,
    selectedByUser,
    description: null as string | null,
  });

  it("splits earlier versions of the chosen design from the same style on other angles", () => {
    const chosen = g("5", 5, "traditional", "A", "COMPLETE", true);
    const all = [
      g("1", 1, "contemporary", "A"),
      g("2", 2, "traditional", "A"),
      g("3", 3, "bold", "A"),
      g("4", 4, "traditional", "B"),
      chosen,
    ];
    const { versions, angles } = chosenDesignGroup(all, chosen);
    expect(versions.map((x) => x.id)).toEqual(["2"]);
    expect(angles.map((x) => x.id)).toEqual(["4"]);
  });

  it("ignores unfinished earlier versions", () => {
    const chosen = g("2", 2, "traditional", "A", "COMPLETE", true);
    const { versions } = chosenDesignGroup([g("1", 1, "traditional", "A", "FAILED"), chosen], chosen);
    expect(versions).toEqual([]);
  });
});
