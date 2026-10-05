import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("next.config redirects", () => {
  it("sends the www host to the main address, permanently, keeping the path", async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects).toEqual([
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.glowupp.co.uk" }],
        destination: "https://glowupp.co.uk/:path*",
        permanent: true,
      },
    ]);
  });
});
