import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { BLOG_POSTS } from "@/lib/blog";
import { HOMEPAGE_CATEGORIES } from "@/lib/homepage-categories";
import { isCrawler } from "@/lib/crawler";
import { PRIVATE_PATHS, SITE_ORIGIN, STATIC_PUBLIC_PAGES, absoluteUrl, breadcrumbJsonLd, categoryFaq, categoryMetadata, faqJsonLd, jsonLdString, pageMetadata, sitemapPages } from "@/lib/seo";

describe("pageMetadata", () => {
  it("sets the title, description, canonical address and the link-preview tags", () => {
    const m = pageMetadata({ title: "T", description: "D", path: "/x" });
    expect(m.title).toBe("T");
    expect(m.description).toBe("D");
    expect(m.alternates?.canonical).toBe("/x");
    expect(m.openGraph).toMatchObject({ title: "T", description: "D", url: "/x", siteName: "GlowUpp", locale: "en_GB" });
    expect(m.twitter).toMatchObject({ card: "summary_large_image", title: "T" });
    // a page's own openGraph replaces the layout's whole, so it must carry the share image itself
    expect((m.openGraph as { images: { url: string }[] }).images[0].url).toBe("/share-image.png");
    expect((m.twitter as { images: string[] }).images).toEqual(["/share-image.png"]);
    expect(m.robots).toBeUndefined();
  });
  it("keeps a noindex page out of search results", () => {
    expect(pageMetadata({ title: "T", description: "D", path: "/x", noindex: true }).robots).toEqual({ index: false, follow: false });
  });
});

describe("category pages", () => {
  it("every category has its own title and description that name the category, and a canonical /redesign/<key>", () => {
    const titles = new Set<string>();
    for (const c of HOMEPAGE_CATEGORIES) {
      const m = categoryMetadata(c.key)!;
      expect(String(m.title)).toContain(c.displayName);
      expect(String(m.description).length).toBeGreaterThan(40);
      expect(m.alternates?.canonical).toBe(`/redesign/${c.key}`);
      titles.add(String(m.title));
    }
    expect(titles.size).toBe(HOMEPAGE_CATEGORIES.length); // no two pages share a title
  });
  it("returns nothing for an unknown category", () => {
    expect(categoryMetadata("nonsense")).toBeNull();
    expect(categoryFaq("nonsense")).toEqual([]);
  });
  it("the FAQ is honest: free for homeowners, optional, illustrations not plans", () => {
    const text = categoryFaq("kitchen").map((f) => `${f.question} ${f.answer}`).join(" ");
    expect(text).toContain("free for homeowners");
    expect(text).toMatch(/optional/);
    expect(text).toMatch(/illustrations/);
    expect(text).not.toMatch(/guarantee|best price|instant|in seconds/i);
  });
});

describe("sitemap and robots", () => {
  it("lists the public pages and every category, with absolute canonical addresses and no duplicates", () => {
    const urls = sitemap().map((s) => s.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const u of urls) expect(u.startsWith(`${SITE_ORIGIN}/`) || u === SITE_ORIGIN).toBe(true);
    expect(urls).toContain(absoluteUrl("/"));
    expect(urls).toContain(absoluteUrl("/how-it-works"));
    for (const c of HOMEPAGE_CATEGORIES) expect(urls).toContain(absoluteUrl(`/redesign/${c.key}`));
    expect(urls).toHaveLength(STATIC_PUBLIC_PAGES.length + HOMEPAGE_CATEGORIES.length + BLOG_POSTS.length);
  });
  it("never lists a private or noindex page in the sitemap", () => {
    for (const p of sitemapPages()) {
      for (const priv of PRIVATE_PATHS) expect(p.path.startsWith(priv)).toBe(false);
      expect(["/signup", "/login", "/launch"]).not.toContain(p.path);
    }
  });
  it("robots.txt allows the site, blocks the private areas and points at the sitemap", () => {
    const r = robots();
    const rule = (Array.isArray(r.rules) ? r.rules[0] : r.rules) as { userAgent: string; allow: string; disallow: string[] };
    expect(rule.userAgent).toBe("*");
    expect(rule.allow).toBe("/");
    for (const p of ["/admin", "/api/", "/dashboard", "/projects/", "/partner/dashboard", "/a/", "/q/"]) expect(rule.disallow).toContain(p);
    expect(r.sitemap).toBe(`${SITE_ORIGIN}/sitemap.xml`);
  });
  it("does not block any page the sitemap lists", () => {
    for (const p of sitemapPages()) for (const priv of PRIVATE_PATHS) expect(p.path.startsWith(priv)).toBe(false);
  });
});

describe("structured data", () => {
  it("builds FAQ and breadcrumb JSON-LD from the same text the page shows", () => {
    const faq = categoryFaq("bathroom");
    const ld = faqJsonLd(faq) as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    expect(ld.mainEntity.map((q) => q.name)).toEqual(faq.map((f) => f.question));
    expect(ld.mainEntity.map((q) => q.acceptedAnswer.text)).toEqual(faq.map((f) => f.answer));
    const bc = breadcrumbJsonLd([{ name: "GlowUpp", path: "/" }, { name: "Bathroom redesign", path: "/redesign/bathroom" }]) as { itemListElement: { position: number; item: string }[] };
    expect(bc.itemListElement.map((i) => i.position)).toEqual([1, 2]);
    expect(bc.itemListElement[1].item).toBe(absoluteUrl("/redesign/bathroom"));
  });
  it("cannot be broken out of its script tag by page content", () => {
    const out = jsonLdString({ a: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(JSON.parse(out).a).toBe("</script><script>alert(1)</script>");
  });
});

describe("isCrawler", () => {
  it("recognises search engines, link-preview bots and scripts", () => {
    for (const ua of [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "WhatsApp/2.23.20.0 A",
      "LinkedInBot/1.0 (compatible; Mozilla/5.0)",
      "Twitterbot/1.0",
      "curl/8.4.0",
      "python-requests/2.31",
      "Chrome-Lighthouse",
      "",
    ]) expect(isCrawler(ua)).toBe(true);
    expect(isCrawler(null)).toBe(true);
    expect(isCrawler(undefined)).toBe(true);
  });
  it("lets real browsers through", () => {
    for (const ua of [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
    ]) expect(isCrawler(ua)).toBe(false);
  });
});
