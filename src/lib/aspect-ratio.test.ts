import { describe, it, expect } from "vitest";
import { nearestAspectRatio } from "./aspect-ratio";

describe("nearestAspectRatio", () => {
  it("matches common photo shapes", () => {
    expect(nearestAspectRatio(1640, 1210)).toBe("4:3"); // the wide living-room test photo
    expect(nearestAspectRatio(4000, 3000)).toBe("4:3");
    expect(nearestAspectRatio(3000, 2000)).toBe("3:2");
    expect(nearestAspectRatio(1920, 1080)).toBe("16:9");
    expect(nearestAspectRatio(1024, 1024)).toBe("1:1");
    expect(nearestAspectRatio(3024, 4032)).toBe("3:4"); // portrait phone photo
    expect(nearestAspectRatio(1080, 1920)).toBe("9:16");
  });

  it("clamps shapes beyond the supported range to the nearest edge", () => {
    expect(nearestAspectRatio(3000, 500)).toBe("16:9");
    expect(nearestAspectRatio(500, 3000)).toBe("9:16");
  });

  it("returns undefined for unusable dimensions", () => {
    expect(nearestAspectRatio(0, 100)).toBeUndefined();
    expect(nearestAspectRatio(100, NaN)).toBeUndefined();
  });
});
