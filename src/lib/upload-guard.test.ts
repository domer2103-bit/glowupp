import { describe, expect, it } from "vitest";
import { REQUEST_NETWORK_ERROR, UPLOAD_NETWORK_ERROR, withNetworkGuard } from "./upload-guard";

type S = { error?: string } | undefined;

describe("withNetworkGuard", () => {
  it("passes a normal result through", async () => {
    const guarded = withNetworkGuard<S>(async () => ({ error: "Pick a style." }));
    expect(await guarded(undefined, new FormData())).toEqual({ error: "Pick a style." });
  });

  it("turns a thrown network error into the upload message by default", async () => {
    const guarded = withNetworkGuard<S>(async () => {
      throw new TypeError("Load failed");
    });
    expect(await guarded(undefined, new FormData())).toEqual({ error: UPLOAD_NETWORK_ERROR });
  });

  it("uses a custom message when given", async () => {
    const guarded = withNetworkGuard<S>(async () => {
      throw new TypeError("Load failed");
    }, REQUEST_NETWORK_ERROR);
    expect(await guarded(undefined, new FormData())).toEqual({ error: REQUEST_NETWORK_ERROR });
  });

  it("re-throws Next control-flow errors such as redirects", async () => {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/x;307;" });
    const guarded = withNetworkGuard<S>(async () => {
      throw redirect;
    });
    await expect(guarded(undefined, new FormData())).rejects.toBe(redirect);
  });
});
