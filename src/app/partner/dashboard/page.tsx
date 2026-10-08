import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentPartner, getPartnerDashboard } from "@/lib/data/affiliates";
import { APP_URL } from "@/lib/notifications";
import { AFFILIATE_DEFAULT_HEADLINES, buildAffiliateLink } from "@/lib/affiliate";
import { SUPPORT_EMAIL } from "@/lib/partner-terms";
import { formatPenceExact } from "@/lib/money";
import { partnerSignOut } from "@/lib/actions/partner";
import { AffiliateStatus } from "@/generated/prisma/client";
import { AffiliateAssetCanvas } from "@/components/AffiliateAssetCanvas";
import { CopyLink } from "@/components/CopyLink";

export const metadata: Metadata = { title: "Partner dashboard — GlowUpp", robots: { index: false } };

export default async function PartnerDashboardPage(props: PageProps<"/partner/dashboard">) {
  const params = await props.searchParams;
  // A magic link from an email arrives as ?token=…; /partner/enter turns it into a session and comes back here without it.
  if (typeof params.token === "string" && params.token !== "") redirect(`/partner/enter?token=${encodeURIComponent(params.token)}`);

  const partner = await getCurrentPartner();
  if (!partner) redirect("/partner/login");
  const dashboard = await getPartnerDashboard(partner.id);
  if (!dashboard) redirect("/partner/login");

  const link = buildAffiliateLink(APP_URL, dashboard.qrSlug);
  const stats: [string, string][] = [
    ["Visits to your link", String(dashboard.clickCount)],
    ["Redesigns started", String(dashboard.projects)],
    ["Jobs booked", String(dashboard.conversions)],
    [`Your ${dashboard.revenueSharePercent}% share earned`, formatPenceExact(dashboard.totalEarningsPence)],
    ["Paid to you", formatPenceExact(dashboard.paidEarningsPence)],
    ["Waiting to be paid", formatPenceExact(Math.max(0, dashboard.balancePence))],
  ];

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-4 py-10 text-[#132a4d] sm:px-6 sm:py-16">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />

      <div className="relative flex w-full max-w-3xl flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{dashboard.businessName}</h1>
            <p className="mt-1 text-sm text-zinc-500">Partner dashboard · hi {dashboard.contactName}</p>
          </div>
          <form action={partnerSignOut}>
            <button type="submit" className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-[#132a4d] hover:border-[#3a6694]">
              Sign out
            </button>
          </form>
        </div>

        {dashboard.status === AffiliateStatus.SUSPENDED && (
          <p className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-800">
            Your account is paused, so your link isn&apos;t crediting new visitors right now. Anything you&apos;ve already earned is still yours. Please email{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        )}

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs text-zinc-500">{label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </section>
        <p className="text-xs text-zinc-500">
          You earn {dashboard.revenueSharePercent}% of the lead fee GlowUpp collects on jobs booked by homeowners who started through your link. A share appears once the
          professional has paid their fee. We&apos;ll be in touch to arrange payment of what you&apos;re owed.
        </p>

        <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Your link</h2>
          <CopyLink link={link} />
          <p className="text-xs text-zinc-500">This is what your QR code opens. Share it anywhere — posts, bios, WhatsApp.</p>
        </section>

        <section id="materials" className="flex scroll-mt-6 flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Your printables</h2>
          <p className="text-sm text-zinc-500">Poster, coaster and social graphic, each with your name and QR code. Edit the headline if you like, then download.</p>
          <AffiliateAssetCanvas
            businessName={dashboard.businessName}
            businessSlug={dashboard.qrSlug}
            link={link}
            categoryHeadline={AFFILIATE_DEFAULT_HEADLINES[partner.category]}
          />
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Payments to you</h2>
          {dashboard.payouts.length === 0 ? (
            <p className="text-sm text-zinc-500">Nothing paid yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 text-sm">
              {dashboard.payouts.map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-2 py-2">
                  <span className="font-medium tabular-nums">{formatPenceExact(p.amountPence)}</span>
                  <span className="text-zinc-500">{new Date(p.paidAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
