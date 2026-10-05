/** Where a contractor sends the quote for a private estimate request: the Private leads tab, scrolled to that client's card. */
export function privateLeadHref(sessionId?: string | null): string {
  return `/professional/pipeline?tab=leads${sessionId ? `#lead-${sessionId}` : ""}`;
}

/** The id the lead card carries, so privateLeadHref() can scroll to it. */
export function privateLeadAnchorId(sessionId: string): string {
  return `lead-${sessionId}`;
}
