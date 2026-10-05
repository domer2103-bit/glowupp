import { describe, expect, it, vi } from "vitest";

const tx = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: tx.transaction } }));
vi.mock("@/lib/design-generation", () => ({ runDesignGeneration: vi.fn() }));

import { reserveConcepts, type ConceptSpec } from "@/lib/design-jobs";

const spec: ConceptSpec = { sourcePhotoId: "p", mode: "generate", sourceStoragePath: "x.jpg", prompt: "x" };

describe("reserveConcepts", () => {
  it("returns an empty list without touching the database when there is nothing to reserve", async () => {
    expect(await reserveConcepts("proj", [])).toEqual([]);
    expect(tx.transaction).not.toHaveBeenCalled();
  });

  it("returns null when another request already took the next version number (unique violation)", async () => {
    tx.transaction.mockRejectedValueOnce(Object.assign(new Error("Unique constraint failed"), { code: "P2002" }));
    expect(await reserveConcepts("proj", [spec])).toBeNull();
  });

  it("rethrows any other database error", async () => {
    tx.transaction.mockRejectedValueOnce(new Error("connection lost"));
    await expect(reserveConcepts("proj", [spec])).rejects.toThrow("connection lost");
  });
});
