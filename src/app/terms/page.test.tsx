import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import TermsPage from "./page";

describe("terms of service", () => {
  it("gives hello@glowupp.co.uk as the contact address, not a personal mailbox", () => {
    const text = renderToStaticMarkup(<TermsPage />).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(text).toContain("hello@glowupp.co.uk");
    expect(text).not.toContain("gmail.com");
  });
});
