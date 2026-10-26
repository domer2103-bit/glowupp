import { describe, expect, it } from "vitest";
import { BLOG_POSTS, blogPath, getBlogPost } from "@/lib/blog";
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
      const text = JSON.stringify(p);
      expect(text, p.slug).not.toMatch(/£\s?\d{2,}(?!\d)/); // no price figures: the blog quotes none
    }
  });

  it("are all in the sitemap", () => {
    const paths = sitemapPages().map((s) => s.path);
    expect(paths).toContain("/blog");
    for (const p of BLOG_POSTS) expect(paths).toContain(blogPath(p.slug));
  });
});
