import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PrivacyPolicyPage from "./page";
import { GUEST_COOKIE } from "@/lib/guest-cookie";
import { PRO_REF_COOKIE } from "@/lib/private-pipeline-cookie";
import { AFFILIATE_COOKIE } from "@/lib/affiliate-cookie";
import { PARTNER_COOKIE } from "@/lib/partner-session";

const text = renderToStaticMarkup(<PrivacyPolicyPage />).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("privacy policy cookie section", () => {
  it("names every cookie the app sets, so adding a cookie without updating the policy fails here", () => {
    for (const name of [GUEST_COOKIE, PRO_REF_COOKIE, AFFILIATE_COOKIE, PARTNER_COOKIE, "sb-"]) expect(text).toContain(name);
  });

  it("no longer claims that only strictly necessary cookies are used", () => {
    expect(text).not.toMatch(/only use strictly necessary cookies/i);
    expect(text).toMatch(/does not use advertising cookies/i);
  });

  it("gives hello@glowupp.co.uk as the contact address, not a personal mailbox", () => {
    expect(text).toContain("hello@glowupp.co.uk");
    expect(text).not.toContain("gmail.com");
  });

  it("covers partner and referral data in what we collect and how we use it", () => {
    expect(text).toMatch(/Partner details/);
    expect(text).toMatch(/Referral information/);
    expect(text).toMatch(/run our partner programme/i);
    expect(text).toMatch(/if you sign up as a professional/i);
  });
});
