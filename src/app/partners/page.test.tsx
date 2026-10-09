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

  it("shows the earnings table with the real numbers: £500 -> £12.50, £2,450 -> £61.25, £5,000+ -> £125 (the cap)", () => {
    expect(text).toContain("£500 £25.00 £12.50");
    expect(text).toContain("£2,450 £122.50 £61.25");
    expect(text).toContain("£5,000 or more £250.00 £125.00");
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

  it("explains the own-client rule: a 1% fee after three free jobs, so the partner's share is 0.5% of the quote", () => {
    expect(text).toContain("When a tradesperson you brought works for their own clients");
    expect(text).toContain("pay only 1% instead of 5%");
    expect(text).toContain("first 3 such jobs are free");
    expect(text).toContain("you earn 0.5% of the quote");
    expect(text).toContain("on a £2,450 job the fee is £24.50 and you earn £12.25"); // 1% of £2,450 = £24.50, half = £12.25 = 0.5%
    expect(text).toContain("so your share there is 0.5% of the quote");
    expect(text).toContain("Why is my share smaller on some jobs?");
  });

  it("has a short FAQ that matches the partner terms, including the #ad rule and no self-referral", () => {
    expect(text).toContain('Start the post with "#ad"');
    expect(PARTNER_TERMS.some((t) => t.includes('"#ad"'))).toBe(true);
    expect(text).toMatch(/shares your email address or phone number/);
    expect(text).toContain("hello@glowupp.co.uk");
    expect(html.match(/<details/g)!.length).toBeGreaterThanOrEqual(8);
  });

  it("never names or promises anything about individual homeowners or professionals", () => {
    expect(text).toMatch(/never names or details of homeowners or professionals/);
  });
});

describe("footer", () => {
  it("links to the partners page", () => {
    expect(renderToStaticMarkup(<Footer />)).toContain('href="/partners"');
  });
});
