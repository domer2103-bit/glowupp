import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentPartner, getPartnerDashboard, getPartnerNotices } from "@/lib/data/affiliates";
import { APP_URL } from "@/lib/notifications";
import { AFFILIATE_DEFAULT_HEADLINES, AFFILIATE_MIN_PAYOUT_PENCE, buildAffiliateLink, buildAffiliateProLink, noFeeNoticeMessage } from "@/lib/affiliate";
import { SUPPORT_EMAIL } from "@/lib/partner-terms";
import { formatPenceExact } from "@/lib/money";
import { dismissPartnerNotices, partnerSignOut } from "@/lib/actions/partner";
import { AffiliateStatus } from "@/generated/prisma/client";
import { AffiliateAssetCanvas } from "@/components/AffiliateAssetCanvas";
import { CopyLink } from "@/components/CopyLink";
import { NoFeeNoticePopup } from "./NoFeeNoticePopup";

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
  const proLink = buildAffiliateProLink(APP_URL, dashboard.qrSlug);
  const notices = await getPartnerNotices(partner.id, partner.noticesSeenAt);
  const unseen = notices.filter((n) => n.unseen);
  // One line per kind of job, with a count when there are several, so a burst of free jobs is one clear message rather than a stack.
  const unseenMessages = (["HOMEOWNER", "PROFESSIONAL"] as const)
    .map((source) => ({ source, count: unseen.filter((n) => n.source === source).length }))
    .filter((g) => g.count > 0)
    .map((g) => (g.count > 1 ? `${g.count} jobs: ${noFeeNoticeMessage(g.source)}` : noFeeNoticeMessage(g.source)));
  const stats: [string, string][] = [
    ["Visits to your link", String(dashboard.clickCount)],
    ["Redesigns started", String(dashboard.projects)],
    ["Jobs booked", String(dashboard.conversions)],
    ["Tradespeople signed up", String(dashboard.professionalsReferred)],
    ["Paid jobs from them", String(dashboard.referredProJobs)],
    [`Your ${dashboard.revenueSharePercent}% share earned`, formatPenceExact(dashboard.totalEarningsPence)],
    ["Paid to you", formatPenceExact(dashboard.paidEarningsPence)],
    ["Waiting to be paid", formatPenceExact(Math.max(0, dashboard.balancePence))],
  ];

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-4 py-10 text-[#132a4d] sm:px-6 sm:py-16">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />
      {unseenMessages.length > 0 && (
        <NoFeeNoticePopup title={unseen.length > 1 ? "No fee on some jobs from your link" : "No fee on a job from your link"} messages={unseenMessages} dismiss={dismissPartnerNotices} />
      )}

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
          You earn {dashboard.revenueSharePercent}% of the lead fee GlowUpp collects on jobs booked by homeowners who started through your link, and on jobs won by tradespeople who
          signed up through your tradespeople link. Promotions such as free introductory jobs earn no share, because no fee is collected on them. A share appears once the
          professional has paid their fee. We pay by bank transfer once your account has been checked and at least {formatPenceExact(AFFILIATE_MIN_PAYOUT_PENCE)} is waiting for you.
        </p>
        <section id="updates" className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Updates</h2>
          {notices.length === 0 ? (
            <p className="text-sm text-zinc-500">Nothing to report. If a job from your link has no fee because the professional is on a free introductory job, we&apos;ll tell you here and by email.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 text-sm">
              {notices.map((n) => (
                <li key={n.id} className="flex flex-col gap-1 py-3">
                  <span className="text-xs text-zinc-500">{new Date(n.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  <span>{noFeeNoticeMessage(n.source)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        {!dashboard.verified && (
          <p className="rounded-2xl bg-blue-50 px-5 py-4 text-sm text-[#132a4d]">
            We&apos;re checking your account. We&apos;ll email you if we need your bank details — nothing is lost while we do, your earnings keep adding up.
          </p>
        )}

        <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Your links</h2>
          <p className="text-sm font-medium">For homeowners</p>
          <CopyLink link={link} />
          <p className="mt-2 text-sm font-medium">For tradespeople</p>
          <CopyLink link={proLink} />
          <p className="text-xs text-zinc-500">
            The first opens the redesign tool; the second opens the sign-up for tradespeople. Your QR codes open these. Share them anywhere — posts, bios, WhatsApp.
          </p>
        </section>

        <section id="materials" className="flex scroll-mt-6 flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Your printables</h2>
          <p className="text-sm text-zinc-500">Poster, coaster and social graphic, each with your name and QR code. Edit the headline if you like, then download.</p>
          <AffiliateAssetCanvas
            businessName={dashboard.businessName}
            businessSlug={dashboard.qrSlug}
            link={link}
            proLink={proLink}
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
