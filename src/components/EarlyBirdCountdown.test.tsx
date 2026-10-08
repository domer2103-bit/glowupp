import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { EarlyBirdCountdown } from "./EarlyBirdCountdown";

describe("EarlyBirdCountdown (server render)", () => {
  it("renders the offer, the four unit labels and placeholders instead of a stale time", () => {
    const html = renderToString(<EarlyBirdCountdown />);
    expect(html).toContain("Early-bird offer");
    expect(html).toContain("first 2 jobs have no commission");
    for (const label of ["days", "hours", "mins", "secs"]) expect(html).toContain(label);
    expect(html).toContain("--");
    expect(html).toContain("26 November 2026");
  });
});
