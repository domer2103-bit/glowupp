import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BLOG_POSTS, blogPath, blogShareImage, getBlogPost } from "@/lib/blog";
import { LEAD_FEE_CAP_PENCE } from "@/lib/fees";
import { formatPence } from "@/lib/money";
import { getHomepageCategory } from "@/lib/homepage-categories";
import { sitemapPages } from "@/lib/seo";

describe("blog posts", () => {
  it("have unique slugs, a known category and a sensible description length", () => {
    const slugs = BLOG_POSTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const p of BLOG_POSTS) {
      expect(getHomepageCategory(p.category), p.slug).toBeDefined();
      expect(p.description.length, p.slug).toBeLessThanOrEqual(190);
      expect(p.faq.length, p.slug).toBeGreaterThanOrEqual(3);
      expect(p.blocks.some((b) => b.type === "h2"), p.slug).toBe(true);
    }
  });

  it("only link to posts that exist", () => {
    for (const p of BLOG_POSTS) for (const r of p.related) expect(getBlogPost(r), `${p.slug} -> ${r}`).toBeDefined();
  });

  it("avoid invented prices and statistics", () => {
    for (const p of BLOG_POSTS) {
      // GlowUpp's own fee cap (from the real constant) is allowed; any other price figure is not.
      const text = JSON.stringify(p).replaceAll(formatPence(LEAD_FEE_CAP_PENCE), "");
      expect(text, p.slug).not.toMatch(/£\s?\d{2,}(?!\d)/);
    }
  });

  it("each have a link-preview picture in /public/share", () => {
    for (const p of BLOG_POSTS) expect(existsSync(path.join(process.cwd(), "public", blogShareImage(p).url)), p.slug).toBe(true);
  });

  it("are all in the sitemap", () => {
    const paths = sitemapPages().map((s) => s.path);
    expect(paths).toContain("/blog");
    for (const p of BLOG_POSTS) expect(paths).toContain(blogPath(p.slug));
  });
});
