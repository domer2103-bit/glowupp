import { jsonLdString } from "@/lib/seo";

/** Structured data for search engines. Rendered into the page's HTML (not injected by script) so crawlers read it without running JavaScript. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />;
}
