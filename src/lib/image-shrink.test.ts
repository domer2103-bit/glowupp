import { describe, expect, it, vi } from "vitest";
import {
  SHRINK_JPEG_QUALITY,
  SHRINK_MAX_EDGE,
  SHRINK_SKIP_BYTES,
  jpegName,
  planShrink,
  shouldAttemptShrink,
  shrinkFormDataFiles,
  shrinkImageFile,
  type ImageEngine,
} from "./image-shrink";
import { UPLOAD_NETWORK_ERROR, withNetworkGuard } from "./upload-guard";

/** A fake browser: "decodes" to given dimensions and "encodes" to a blob of a size we choose. */
function fakeEngine(opts: { width: number; height: number; encodedBytes?: number | null; decodeFails?: boolean }): ImageEngine & { encodeCalls: [number, number, number][]; closed: number } {
  const state = { encodeCalls: [] as [number, number, number][], closed: 0 };
  return Object.assign(state, {
    async decode() {
      if (opts.decodeFails) throw new Error("cannot decode");
      return {
        width: opts.width,
        height: opts.height,
        async encode(w: number, h: number, q: number) {
          state.encodeCalls.push([w, h, q]);
          return opts.encodedBytes === null ? null : new Blob([new Uint8Array(opts.encodedBytes ?? 300_000)], { type: "image/jpeg" });
        },
        close() {
          state.closed += 1;
        },
      };
    },
  });
}
const photo = (name: string, bytes: number, type = "image/jpeg") => new File([new Uint8Array(bytes)], name, { type });

describe("planShrink", () => {
  it("fits the long edge to 2048 and keeps the aspect ratio, landscape or portrait", () => {
    expect(planShrink(4000, 3000)).toEqual({ width: 2048, height: 1536, scaled: true });
    expect(planShrink(3000, 4000)).toEqual({ width: 1536, height: 2048, scaled: true });
    expect(planShrink(4032, 3024)).toEqual({ width: 2048, height: 1536, scaled: true });
  });
  it("never enlarges a photo that already fits", () => {
    expect(planShrink(1600, 1200)).toEqual({ width: 1600, height: 1200, scaled: false });
    expect(planShrink(SHRINK_MAX_EDGE, 100)).toEqual({ width: SHRINK_MAX_EDGE, height: 100, scaled: false });
  });
  it("never produces a zero-sized side", () => {
    expect(planShrink(100_000, 10)).toEqual({ width: 2048, height: 1, scaled: true });
  });
});

describe("shouldAttemptShrink / jpegName", () => {
  it("tries real photos above the small-file threshold, and skips small files, PDFs and other types", () => {
    expect(shouldAttemptShrink({ type: "image/jpeg", size: SHRINK_SKIP_BYTES + 1 })).toBe(true);
    expect(shouldAttemptShrink({ type: "IMAGE/PNG", size: 5_000_000 })).toBe(true);
    expect(shouldAttemptShrink({ type: "image/heic", size: 5_000_000 })).toBe(true);
    expect(shouldAttemptShrink({ type: "image/jpeg", size: SHRINK_SKIP_BYTES })).toBe(false);
    expect(shouldAttemptShrink({ type: "application/pdf", size: 9_000_000 })).toBe(false);
    expect(shouldAttemptShrink({ type: "image/gif", size: 9_000_000 })).toBe(false);
  });
  it("renames to .jpg", () => {
    expect(jpegName("IMG_1234.HEIC")).toBe("IMG_1234.jpg");
    expect(jpegName("kitchen.final.png")).toBe("kitchen.final.jpg");
    expect(jpegName("noextension")).toBe("noextension.jpg");
    expect(jpegName("")).toBe("photo.jpg");
  });
});

describe("shrinkImageFile", () => {
  it("turns a big phone photo into a much smaller 2048px JPEG", async () => {
    const engine = fakeEngine({ width: 4032, height: 3024, encodedBytes: 350_000 });
    const out = await shrinkImageFile(photo("IMG_0001.JPG", 6_000_000), engine);
    expect(out.size).toBe(350_000);
    expect(out.type).toBe("image/jpeg");
    expect(out.name).toBe("IMG_0001.jpg");
    expect(engine.encodeCalls).toEqual([[2048, 1536, SHRINK_JPEG_QUALITY]]);
    expect(engine.closed).toBe(1); // decoded image released
  });

  it("leaves a small file exactly as it is, without even decoding", async () => {
    const engine = fakeEngine({ width: 1000, height: 800 });
    const small = photo("small.jpg", 200_000);
    expect(await shrinkImageFile(small, engine)).toBe(small);
    expect(engine.encodeCalls).toHaveLength(0);
  });

  it("returns the ORIGINAL if the browser cannot decode it, encoding fails, or the result is not smaller", async () => {
    const big = photo("a.jpg", 3_000_000);
    expect(await shrinkImageFile(big, fakeEngine({ width: 4000, height: 3000, decodeFails: true }))).toBe(big);
    expect(await shrinkImageFile(big, fakeEngine({ width: 4000, height: 3000, encodedBytes: null }))).toBe(big);
    expect(await shrinkImageFile(big, fakeEngine({ width: 4000, height: 3000, encodedBytes: 0 }))).toBe(big);
    expect(await shrinkImageFile(big, fakeEngine({ width: 2000, height: 1500, encodedBytes: 3_500_000 }))).toBe(big);
  });

  it("converts a HEIC to JPEG even if that is not smaller, and returns a HEIC unchanged when the browser cannot read it", async () => {
    const heic = photo("IMG_9.HEIC", 1_000_000, "image/heic");
    const converted = await shrinkImageFile(heic, fakeEngine({ width: 1500, height: 1000, encodedBytes: 1_100_000 }));
    expect(converted.type).toBe("image/jpeg");
    expect(converted.name).toBe("IMG_9.jpg");
    expect(await shrinkImageFile(heic, fakeEngine({ width: 1500, height: 1000, decodeFails: true }))).toBe(heic);
  });

  it("closes the decoded image even when encoding throws", async () => {
    const engine = fakeEngine({ width: 4000, height: 3000 });
    const original = engine.decode.bind(engine);
    const closing = vi.fn();
    engine.decode = async (f: File) => {
      const img = await original(f);
      return { ...img, encode: async () => { throw new Error("boom"); }, close: closing };
    };
    const big = photo("x.jpg", 3_000_000);
    expect(await shrinkImageFile(big, engine)).toBe(big);
    expect(closing).toHaveBeenCalledTimes(1);
  });
});

describe("shrinkFormDataFiles", () => {
  it("shrinks every file in the named fields, keeps order, and leaves other fields and fields not named alone", async () => {
    const fd = new FormData();
    fd.set("title", "Kitchen");
    fd.append("photos", photo("one.jpg", 4_000_000));
    fd.append("photos", photo("two.png", 100_000, "image/png")); // small: untouched
    fd.append("photos", photo("three.jpg", 5_000_000));
    const doc = photo("licence.pdf", 3_000_000, "application/pdf");
    fd.set("document", doc);
    await shrinkFormDataFiles(fd, ["photos", "document", "missing"], fakeEngine({ width: 4000, height: 3000, encodedBytes: 250_000 }));

    const photos = fd.getAll("photos") as File[];
    expect(photos.map((f) => [f.name, f.size])).toEqual([["one.jpg", 250_000], ["two.png", 100_000], ["three.jpg", 250_000]]);
    expect(fd.get("title")).toBe("Kitchen");
    expect(fd.get("document")).toBe(fd.get("document")); // the PDF is not touched
    expect((fd.get("document") as File).type).toBe("application/pdf");
    expect((fd.get("document") as File).size).toBe(3_000_000);
  });

  it("does nothing, and does not throw, when a field has no file", async () => {
    const fd = new FormData();
    fd.set("file", "");
    await expect(shrinkFormDataFiles(fd, ["file"], fakeEngine({ width: 1, height: 1 }))).resolves.toBeUndefined();
    expect(fd.get("file")).toBe("");
  });
});

describe("withNetworkGuard", () => {
  const ok = async (): Promise<{ error?: string; info?: string } | undefined> => ({ info: "done" });
  it("passes a normal result through", async () => {
    expect(await withNetworkGuard<{ error?: string; info?: string } | undefined>(ok)(undefined, new FormData())).toEqual({ info: "done" });
  });
  it("turns a dropped connection into a friendly error instead of a crash", async () => {
    const failing = async () => {
      throw new TypeError("Failed to fetch");
    };
    expect(await withNetworkGuard<{ error?: string } | undefined>(failing)(undefined, new FormData())).toEqual({ error: UPLOAD_NETWORK_ERROR });
  });
  it("re-throws Next's own control-flow errors (redirect / not found)", async () => {
    const redirecting = async () => {
      throw Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/login;307;" });
    };
    await expect(withNetworkGuard<{ error?: string } | undefined>(redirecting)(undefined, new FormData())).rejects.toThrow("NEXT_REDIRECT");
  });
});
