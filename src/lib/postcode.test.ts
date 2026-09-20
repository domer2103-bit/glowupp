import { describe, it, expect } from "vitest";
import { getOutwardCode, postcodeMatchesPrefix } from "./postcode";

describe("getOutwardCode", () => {
  it("extracts the outward code from a spaced postcode", () => {
    expect(getOutwardCode("L18 5NF")).toBe("L18");
  });

  it("extracts the outward code from a longer district", () => {
    expect(getOutwardCode("SW1A 1AA")).toBe("SW1A");
  });

  it("handles no space by taking everything but the last 3 characters (the inward code)", () => {
    expect(getOutwardCode("SW1A1AA")).toBe("SW1A");
    expect(getOutwardCode("L185NF")).toBe("L18");
  });

  it("uppercases and normalizes whitespace", () => {
    expect(getOutwardCode("  l18   5nf  ")).toBe("L18");
  });

  it("returns the whole cleaned string if it's too short to have an inward code", () => {
    expect(getOutwardCode("L1")).toBe("L1");
  });
});

describe("postcodeMatchesPrefix", () => {
  it("matches an exact district prefix", () => {
    expect(postcodeMatchesPrefix("L18 5NF", "L18")).toBe(true);
  });

  it("matches a whole-area prefix covering multiple districts", () => {
    expect(postcodeMatchesPrefix("L18 5NF", "L")).toBe(true);
    expect(postcodeMatchesPrefix("L1 0AA", "L")).toBe(true);
  });

  it("rejects a district outside the prefix", () => {
    expect(postcodeMatchesPrefix("M1 1AA", "L")).toBe(false);
  });

  it("rejects a different district under the same letter", () => {
    expect(postcodeMatchesPrefix("L1 0AA", "L18")).toBe(false);
  });

  it("is case-insensitive and trims the prefix", () => {
    expect(postcodeMatchesPrefix("l18 5nf", " l18 ")).toBe(true);
  });
});
