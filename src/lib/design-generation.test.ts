import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/storage", () => ({ getSignedPhotoUrl: vi.fn(), uploadGeneratedDesign: vi.fn() }));
vi.mock("@/lib/image-providers", () => ({ getImageProvider: vi.fn() }));

import { buildDesignPrompt } from "./design-generation";
import { getProjectTypeDefinition } from "./project-types";

describe("buildDesignPrompt", () => {
  it("keeps quote-only detail (size, subfloor, known problems) out of the picture prompt", () => {
    const def = getProjectTypeDefinition("flooring")!;
    const prompt = buildDesignPrompt(
      { title: "Hall floor", description: null } as never,
      def,
      { desiredMaterial: "laminate", desiredStyle: "Scandinavian", approxFloorAreaSqm: 18, subfloor: "concrete", floorAndWallCondition: "damp and uneven" }
    );
    expect(prompt).toContain("laminate");
    expect(prompt).toContain("Scandinavian");
    expect(prompt).not.toMatch(/damp|uneven|subfloor|floor area/i);
  });
});
