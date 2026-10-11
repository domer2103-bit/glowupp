/**
 * Minimal UK postcode helpers — just enough for prefix-based matching
 * (src/lib/matching.ts). Not a full postcode validator/geocoder.
 */

/** Extracts the outward code (postcode district) from a UK postcode, e.g. "L18 5NF" -> "L18", "SW1A1AA" -> "SW1A". */
export function getOutwardCode(postcode: string): string {
  const cleaned = postcode.trim().toUpperCase().replace(/\s+/g, " ");
  if (cleaned.includes(" ")) return cleaned.split(" ")[0];
  // No space typed: the inward code is always digit+letter+letter (3 chars), so whatever's left is the outward code.
  return cleaned.length > 3 ? cleaned.slice(0, -3) : cleaned;
}

/** True if the postcode's outward code starts with the given prefix, e.g. prefix "L" matches "L18", prefix "L18" matches only "L18"/"L180"-style codes. Case-insensitive. */
export function postcodeMatchesPrefix(postcode: string, prefix: string): boolean {
  return getOutwardCode(postcode).startsWith(prefix.trim().toUpperCase());
}

/** "l185nf" -> "L18 5NF". Returns null if it doesn't look like a UK postcode (shape only — it is not checked against a real postcode list). */
export function normalizePostcode(input: string): string | null {
  const match = input.trim().toUpperCase().match(/^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/);
  return match ? `${match[1]} ${match[2]}` : null;
}
