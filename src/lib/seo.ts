import type { Metadata } from "next";
import { HOMEPAGE_CATEGORIES, getHomepageCategory, type HomepageCategory } from "@/lib/homepage-categories";
import { BLOG_POSTS, blogPath } from "@/lib/blog";

/**
 * Everything search engines and link previews need to know about the public site, in one place:
 * canonical addresses, per-page metadata, the sitemap's page list, and schema.org JSON-LD.
 * Pure functions (no DOM, no database) so they can be unit-tested and so robots.ts, sitemap.ts
 * and the pages can never disagree about which URLs are public.
 */

export const SITE_NAME = "GlowUpp";
/** The canonical origin. www.glowupp.co.uk redirects here, so every canonical URL, sitemap entry and JSON-LD URL uses it. Override with SITE_URL only for a staging copy. */
export const SITE_ORIGIN = (process.env.SITE_URL ?? "https://glowupp.co.uk").replace(/\/+$/, "");
export const SITE_TITLE = "GlowUpp — visualise your home renovation, then find the right pro";
export const SITE_DESCRIPTION = "Upload a photo of your space, preview renovation ideas instantly, and connect with trusted local professionals to bring them to life.";

/** The picture shown when a link to the site is shared (Facebook, LinkedIn, WhatsApp, X). 1200 x 630, in /public. */
export const SHARE_IMAGE = { url: "/share-image.png", width: 1200, height: 630, alt: "GlowUpp: see your renovation before you build it. Upload a photo, see an AI redesign, find the right local pro." };

export function absoluteUrl(path: string): string {
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Metadata for one public page: title, description, canonical address and the link-preview (Open Graph / Twitter) tags. `noindex` keeps a page out of search results. */
export function pageMetadata(opts: { title: string; description: string; path: string; noindex?: boolean }): Metadata {
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: opts.path },
    openGraph: { title: opts.title, description: opts.description, url: opts.path, siteName: SITE_NAME, type: "website", locale: "en_GB", images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title: opts.title, description: opts.description, images: [SHARE_IMAGE.url] },
    ...(opts.noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

/** Parts of the site that are private or only useful to a signed-in person: kept out of the crawl (robots.txt). */
export const PRIVATE_PATHS = [
  "/admin",
  "/api/",
  "/dashboard",
  "/projects/",
  "/professional/",
  "/partner/dashboard",
  "/partner/enter",
  "/partner/login",
  "/partner/success",
  "/pro/",
  "/q/",
  "/a/",
] as const;

export interface SitemapPage {
  path: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
}

/** The public marketing pages (the category landing pages are added from HOMEPAGE_CATEGORIES). */
export const STATIC_PUBLIC_PAGES: readonly SitemapPage[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/how-it-works", priority: 0.8, changeFrequency: "monthly" },
  { path: "/professionals", priority: 0.8, changeFrequency: "weekly" },
  { path: "/partners", priority: 0.7, changeFrequency: "monthly" },
  { path: "/partner/join", priority: 0.5, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
];

export function categoryPath(key: string): string {
  return `/redesign/${key}`;
}

export function sitemapPages(): SitemapPage[] {
  return [
    ...STATIC_PUBLIC_PAGES,
    ...HOMEPAGE_CATEGORIES.map((c) => ({ path: categoryPath(c.key), priority: 0.9, changeFrequency: "monthly" as const })),
    ...BLOG_POSTS.map((p) => ({ path: blogPath(p.slug), priority: 0.6, changeFrequency: "monthly" as const })),
  ];
}

/** Lowercase noun for use mid-sentence: "Living room" -> "living room". */
function noun(category: HomepageCategory): string {
  return category.displayName.toLowerCase();
}

export function categoryMetadata(key: string): Metadata | null {
  const category = getHomepageCategory(key);
  if (!category) return null;
  return pageMetadata({
    title: `${category.displayName} redesign from a photo | GlowUpp`,
    description: `${category.heroSubcopy} No sign-up needed to start.`,
    path: categoryPath(category.key),
  });
}

export interface FaqItem {
  question: string;
  answer: string;
}

/** The questions shown on each category page and echoed in its FAQ structured data (the two always come from this one list, so they cannot drift apart). */
export function categoryFaq(key: string): FaqItem[] {
  const category = getHomepageCategory(key);
  if (!category) return [];
  const n = noun(category);
  return [
    {
      question: `How does a ${n} redesign on GlowUpp work?`,
      answer: `Upload a photo of your ${n}, choose a style, colours and what you would like to change, and GlowUpp creates an AI redesign based on your real photo. If it is not quite right you can try a different style or ask for specific changes.`,
    },
    {
      question: "Do I need an account?",
      answer: "No. You can start without signing up. Create a free account when you want to save your project or ask local professionals for a quote.",
    },
    {
      question: "Does it cost anything?",
      answer: "It is free for homeowners. Professionals pay GlowUpp a small fee only once you have picked them.",
    },
    {
      question: "Are the designs exact plans?",
      answer: "No. They are AI-generated illustrations to help you picture the result and brief a professional. A professional should survey your space and confirm what is possible and what it will cost before any work starts.",
    },
    {
      question: "Do I have to hire anyone?",
      answer: "No. Sharing your design with local professionals to get quotes is optional.",
    },
  ];
}

/** JSON-LD for a page's `<script type="application/ld+json">`. `<` is escaped so page content can never close the script tag. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_ORIGIN,
    logo: absoluteUrl("/icon.svg"),
    description: SITE_DESCRIPTION,
  };
}

export function websiteJsonLd() {
  return { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: SITE_ORIGIN, inLanguage: "en-GB" };
}

export function faqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.question, acceptedAnswer: { "@type": "Answer", text: i.answer } })),
  };
}

export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: absoluteUrl(t.path) })),
  };
}

export function articleJsonLd(post: { title: string; description: string; slug: string; published: string; heroSrc: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.published,
    dateModified: post.published,
    inLanguage: "en-GB",
    image: absoluteUrl(post.heroSrc),
    mainEntityOfPage: absoluteUrl(blogPath(post.slug)),
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: absoluteUrl("/icon.svg") } },
  };
}
