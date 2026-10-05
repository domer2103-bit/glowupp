import { describe, expect, it } from "vitest";
import { itemCountLabel, parseLineItems, readLineItems, sumLineItems, validateDeposit } from "./pipeline-quote";

describe("parseLineItems", () => {
  it("parses rows into pence and skips blank rows", () => {
    const r = parseLineItems([
      { description: "Fit units", amount: "1200" },
      { description: "", amount: "" },
      { description: "Worktop", amount: 349.99 },
    ]);
    expect(r).toEqual({ ok: true, value: [{ description: "Fit units", amountPence: 120000 }, { description: "Worktop", amountPence: 34999 }] });
    if (r.ok) expect(sumLineItems(r.value)).toBe(154999);
  });
  it("rejects empty, missing description, bad amounts and absurd totals", () => {
    expect(parseLineItems([]).ok).toBe(false);
    expect(parseLineItems([{ description: "", amount: "5" }]).ok).toBe(false);
    expect(parseLineItems([{ description: "x", amount: "" }]).ok).toBe(false);
    expect(parseLineItems([{ description: "x", amount: "-5" }]).ok).toBe(false);
    expect(parseLineItems([{ description: "x", amount: "abc" }]).ok).toBe(false);
    expect(parseLineItems([{ description: "x", amount: "2000000" }]).ok).toBe(false);
  });
  it("caps the number of line items", () => {
    expect(parseLineItems(Array.from({ length: 31 }, (_, i) => ({ description: `i${i}`, amount: "1" }))).ok).toBe(false);
  });
});

describe("validateDeposit", () => {
  it("allows no deposit, a partial deposit and the full amount", () => {
    expect(validateDeposit(null, 100000)).toEqual({ ok: true, value: null });
    expect(validateDeposit(25000, 100000)).toEqual({ ok: true, value: 25000 });
    expect(validateDeposit(100000, 100000)).toEqual({ ok: true, value: 100000 });
  });
  it("rejects zero, negative, fractional and over-total deposits", () => {
    expect(validateDeposit(0, 100000).ok).toBe(false);
    expect(validateDeposit(-1, 100000).ok).toBe(false);
    expect(validateDeposit(10.5, 100000).ok).toBe(false);
    expect(validateDeposit(100001, 100000).ok).toBe(false);
  });
});

describe("readLineItems", () => {
  it("drops malformed entries instead of throwing", () => {
    expect(readLineItems([{ description: "a", amountPence: 100 }, { description: 5 }, null, "x"])).toEqual([{ description: "a", amountPence: 100 }]);
    expect(readLineItems(null)).toEqual([]);
  });
});

describe("itemCountLabel", () => {
  it("uses the singular for exactly one item", () => {
    expect(itemCountLabel(1)).toBe("1 item");
  });

  it("uses the plural for any other count", () => {
    expect(itemCountLabel(0)).toBe("0 items");
    expect(itemCountLabel(2)).toBe("2 items");
    expect(itemCountLabel(30)).toBe("30 items");
  });
});
