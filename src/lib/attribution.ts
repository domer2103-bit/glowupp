/**
 * First-touch "where did this visitor come from" capture, so a signup can be
 * credited to a social post or channel. Deliberately tiny and pure (no
 * Prisma, no next/headers) so src/proxy.ts can run it on the Edge runtime.
 *
 * A visit counts only if it carries utm_source/utm_medium/utm_campaign tags or
 * arrives from another website. The first such visit wins for 30 days; later
 * visits never overwrite it. Every value is reduced to a short, safe token so
 * nothing a visitor types can end up as markup, a long string or a secret.
 */
export type Attribution = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  /** Hostname of the referring site, without "www." (e.g. "l.facebook.com"). */
  refHost: string | null;
  /** The page the visitor first landed on (path only, no query string). */
  landing: string | null;
};

const TOKEN_MAX = 40;

function token(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, TOKEN_MAX);
  return cleaned || null;
}

function pathToken(pathname: string): string | null {
  const cleaned = pathname.replace(/[^A-Za-z0-9/_-]+/g, "").slice(0, 60);
  return cleaned || null;
}

/** Hostname of an external referrer, or null when absent, malformed or from our own site. */
export function externalReferrerHost(referer: string | null, ownHost: string): string | null {
  if (!referer) return null;
  try {
    const host = new URL(referer).hostname.toLowerCase().replace(/^www\./, "");
    const own = ownHost.toLowerCase().replace(/^www\./, "").replace(/:\d+$/, "");
    if (!host || host === own) return null;
    return token(host);
  } catch {
    return null;
  }
}

/** The attribution a request carries, or null when it carries none (a direct visit or an internal click). */
export function parseAttribution(url: URL, referer: string | null): Attribution | null {
  const source = token(url.searchParams.get("utm_source"));
  const medium = token(url.searchParams.get("utm_medium"));
  const campaign = token(url.searchParams.get("utm_campaign"));
  const refHost = externalReferrerHost(referer, url.host);
  if (!source && !medium && !campaign && !refHost) return null;
  return { source, medium, campaign, refHost, landing: pathToken(url.pathname) };
}

export function encodeAttribution(a: Attribution): string {
  const params = new URLSearchParams();
  (Object.keys(a) as (keyof Attribution)[]).forEach((k) => {
    if (a[k]) params.set(k, a[k] as string);
  });
  return params.toString();
}

export function decodeAttribution(value: string | undefined | null): Attribution | null {
  if (!value) return null;
  const params = new URLSearchParams(value);
  const a: Attribution = {
    source: token(params.get("source")),
    medium: token(params.get("medium")),
    campaign: token(params.get("campaign")),
    refHost: token(params.get("refHost")),
    landing: params.get("landing") ? pathToken(params.get("landing") as string) : null,
  };
  return a.source || a.medium || a.campaign || a.refHost ? a : null;
}

/** One-word label for reports: the utm source when tagged, otherwise the referring site, otherwise "direct". */
export function attributionLabel(a: Attribution | null): string {
  return a?.source ?? a?.refHost ?? "direct";
}
