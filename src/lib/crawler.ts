/**
 * True for search-engine, link-preview and other automated visitors, judged by the User-Agent header.
 * The redesign pages use it so a bot reading the page never makes the app create a guest user and a draft
 * project (a normal first visit does), which would fill the database with junk on every crawl.
 */
const CRAWLER_PATTERN = /bot|crawl|spider|slurp|facebookexternalhit|embedly|whatsapp|telegram|preview|headless|lighthouse|pagespeed|curl|wget|python-requests|go-http-client|okhttp|java\//i;

export function isCrawler(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true; // real browsers always send one; "no user agent" is a script
  return CRAWLER_PATTERN.test(userAgent);
}
