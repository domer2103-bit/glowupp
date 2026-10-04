import { findReferrerByCode, getReferralCodeFromCookie } from "@/lib/data/private-pipeline";

/**
 * Site-wide strip shown to a visitor who arrived through a contractor's
 * link/QR, so it's obvious who their designs are going to before they
 * upload anything. Renders nothing for everyone else.
 *
 * It lives in the root layout, so it must fail soft: a database hiccup
 * here may hide the banner but must never take down every page. (The
 * lock itself is enforced separately, server-side, where it matters.)
 */
export async function PrivatePortalBanner() {
  // Outside the try/catch on purpose: reading cookies() is what marks the
  // page dynamic (by throwing), and swallowing that would let Next
  // prerender pages statically with no banner.
  const code = await getReferralCodeFromCookie();
  let referrer: Awaited<ReturnType<typeof findReferrerByCode>> = null;
  try {
    referrer = await findReferrerByCode(code);
  } catch (err) {
    console.error("[private-portal-banner] referrer lookup failed:", err);
  }
  if (!referrer) return null;

  return (
    <div role="status" className="w-full bg-[#132a4d] px-6 py-2 text-center text-sm text-white">
      Working with <span className="font-semibold">{referrer.businessName}</span> — Private Design Portal
    </div>
  );
}
