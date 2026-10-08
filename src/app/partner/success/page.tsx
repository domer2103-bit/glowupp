import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import type { Metadata } from "next";
import { getCurrentPartner } from "@/lib/data/affiliates";
import { APP_URL } from "@/lib/notifications";
import { AFFILIATE_DEFAULT_HEADLINES, buildAffiliateLink } from "@/lib/affiliate";
import { PosterDownload } from "./PosterDownload";

export const metadata: Metadata = { title: "You're all set — GlowUpp partner", robots: { index: false } };

const SHELL = "relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-4 py-10 text-[#132a4d] sm:px-6 sm:py-16";
const CARD = "relative flex w-full max-w-md flex-col gap-5 rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-xl shadow-blue-900/10 sm:p-8";

export default async function PartnerSuccessPage() {
  const partner = await getCurrentPartner();

  // No session: the visitor either re-submitted an email that already has an account, or has cookies blocked. Either way
  // the real owner has been emailed a link, and nothing about the account is shown here.
  if (!partner) {
    return (
      <div className={SHELL}>
        <div className={CARD}>
          <h1 className="text-2xl font-semibold">Check your inbox</h1>
          <p className="text-sm text-zinc-600">
            We&apos;ve emailed you your GlowUpp partner link and a sign-in link for your dashboard. It can take a minute to arrive — check your spam folder too.
          </p>
          <Link href="/partner/login" className="text-sm font-medium text-[#3a6694] underline">
            Email me a new sign-in link
          </Link>
        </div>
      </div>
    );
  }

  const link = buildAffiliateLink(APP_URL, partner.qrSlug);

  return (
    <div className={SHELL}>
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />
      <div className={CARD}>
        <p className="text-4xl" aria-hidden="true">
          🎉
        </p>
        <h1 className="text-2xl font-semibold">You&apos;re All Set, {partner.businessName}!</h1>
        <p className="text-sm text-zinc-600">
          Your partner account is live. Show this QR code (or print it) and you earn {Math.round(partner.revenueShareRate.toNumber() * 100)}% of the fee on every job booked by
          homeowners who start through it.
        </p>

        <div className="mx-auto rounded-2xl bg-white p-3 ring-1 ring-zinc-200">
          <QRCodeSVG value={link} size={220} level="M" marginSize={2} title={`QR code for ${partner.businessName}`} />
        </div>
        <code className="mx-auto max-w-full truncate rounded-lg bg-blue-50 px-3 py-1.5 text-xs">{link.replace(/^https?:\/\//, "")}</code>

        <div className="flex flex-col gap-3">
          <PosterDownload
            businessName={partner.businessName}
            businessSlug={partner.qrSlug}
            link={link}
            categoryHeadline={AFFILIATE_DEFAULT_HEADLINES[partner.category]}
          />
          <Link href="/partner/dashboard" className="rounded-full border border-[#3a6694] px-6 py-3.5 text-base font-semibold text-[#3a6694] transition hover:bg-blue-50">
            View My Live Revenue Dashboard
          </Link>
        </div>
        <p className="text-xs text-zinc-500">
          We&apos;ve also emailed you this link and a sign-in link. Your coaster and social graphic are on your dashboard.
        </p>
      </div>
    </div>
  );
}
