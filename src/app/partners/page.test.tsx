import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PartnersPage from "./page";
import { Footer } from "@/components/Footer";
import { AFFILIATE_MIN_PAYOUT_PENCE, PRO_REFERRAL_EARNING_MONTHS } from "@/lib/affiliate";
import { PARTNER_TERMS } from "@/lib/partner-terms";

const html = renderToStaticMarkup(<PartnersPage />);
const text = html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\s+/g, " ");

describe("/partners page", () => {
  it("offers both kinds of partner and links to sign-up and sign-in", () => {
    expect(text).toContain("Homeowner partners");
    expect(text).toContain("Tradespeople partners");
    expect(html).toContain('href="/partner/join"');
    expect(html).toContain('href="/partner/login"');
    expect(html.match(/Become a partner/g)!.length).toBeGreaterThanOrEqual(2);
  });

  it("shows the earnings table with the real numbers: £500 -> £5, £2,450 -> £24.50, £12,500+ -> £125 (the cap)", () => {
    expect(text).toContain("£500 £10.00 £5.00");
    expect(text).toContain("£2,450 £49.00 £24.50");
    expect(text).toContain("£12,500 or more £250.00 £125.00");
  });

  it("is honest about the caveats: free promotional jobs, the 12-month window, the minimum payout, one partner per fee, no guarantee", () => {
    expect(text).toMatch(/Free promotional jobs earn nothing/);
    expect(text).toContain("for 12 months after they sign up");
    expect(PRO_REFERRAL_EARNING_MONTHS).toBe(12); // the page text above follows this constant
    expect(text).toContain("at least £25 is waiting");
    expect(AFFILIATE_MIN_PAYOUT_PENCE).toBe(2500);
    expect(text).toMatch(/one partner at most/);
    expect(text).toMatch(/not as guaranteed income/);
    expect(text).not.toMatch(/guaranteed earnings|you will earn|passive income/i);
  });

  it("explains the own-client rule: three free jobs, then the same 2% fee, so the partner's share is 1% of the quote", () => {
    expect(text).toContain("When a tradesperson you brought works for their own clients");
    expect(text).toContain("then the same 2% fee applies");
    expect(text).toContain("Their first 3 such jobs are free");
    expect(text).toContain("you earn 1% of the quote");
    expect(text).toContain("on a £2,450 job the fee is £49.00 and you earn £24.50"); // 2% of £2,450 = £49, half = £24.50 = 1%
    expect(text).toContain("so your share there is 1% of the quote");
    expect(text).toContain("Why is my share smaller on some jobs?");
  });

  it("has a short FAQ that matches the partner terms, including the #ad rule and no self-referral", () => {
    expect(text).toContain('Start the post with "#ad"');
    expect(PARTNER_TERMS.some((t) => t.includes('"#ad"'))).toBe(true);
    expect(text).toMatch(/shares your email address or phone number/);
    expect(text).toContain("hello@glowupp.co.uk");
    expect(html.match(/<details/g)!.length).toBeGreaterThanOrEqual(8);
  });

  it("never shows homeowner names, and shows a tradesperson's business name only if they chose to share it", () => {
    expect(text).toMatch(/but never their names or details/);
    expect(text).toMatch(/only see a business name if that tradesperson chose to share it/);
    expect(text).toMatch(/never phone numbers, emails or details of their jobs/);
  });
});

describe("footer", () => {
  it("links to the partners page", () => {
    expect(renderToStaticMarkup(<Footer />)).toContain('href="/partners"');
  });
});
