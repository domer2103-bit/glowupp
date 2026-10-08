import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getAffiliatePartner, getBlockedSelfReferrals } from "@/lib/data/affiliates";
import { releaseSelfReferral } from "@/lib/actions/affiliates";
import { APP_URL } from "@/lib/notifications";
import { AFFILIATE_CATEGORY_LABELS, AFFILIATE_DEFAULT_HEADLINES, AFFILIATE_MIN_PAYOUT_PENCE, buildAffiliateLink, buildAffiliateProLink } from "@/lib/affiliate";
import { formatPenceExact } from "@/lib/money";
import { AffiliateStatus, UserRole } from "@/generated/prisma/client";
import { AffiliateAssetCanvas } from "@/components/AffiliateAssetCanvas";
import { CopyLink } from "@/components/CopyLink";
import { PartnerControls } from "../PartnerControls";

export default async function AdminAffiliatePartnerPage(props: PageProps<"/admin/affiliates/[id]">) {
  await requireRole(UserRole.ADMIN);
  const { id } = await props.params;
  const data = await getAffiliatePartner(id);
  if (!data) notFound();
  const { partner, row } = data;
  const link = buildAffiliateLink(APP_URL, partner.qrSlug);
  const proLink = buildAffiliateProLink(APP_URL, partner.qrSlug);
  const blocked = await getBlockedSelfReferrals(partner.id);

  const stats: [string, string][] = [
    ["Clicks", String(row.clickCount)],
    ["Projects started", String(row.projects)],
    ["Conversions", String(row.conversions)],
    ["Tradespeople referred", String(row.professionalsReferred)],
    ["Paid jobs from them", String(row.referredProJobs)],
    ["Job value", formatPenceExact(row.gmvPence)],
    ["GlowUpp profit", formatPenceExact(row.glowuppProfitPence)],
    [`Partner share (${Math.round(row.revenueShareRate * 100)}%)`, formatPenceExact(row.totalEarningsPence)],
    ["Paid out", formatPenceExact(row.paidEarningsPence)],
    ["Owed", formatPenceExact(row.balancePence)],
  ];

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-6 py-16 text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />

      <div className="relative flex w-full max-w-4xl flex-col gap-8">
        <div>
          <Link href="/admin/affiliates" className="text-sm text-zinc-600 underline">
            ← Partner program
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{partner.businessName}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {AFFILIATE_CATEGORY_LABELS[partner.category]} · {partner.contactName} · {partner.email}
            {partner.phone ? ` · ${partner.phone}` : ""} ·{" "}
            {partner.status === AffiliateStatus.ACTIVE ? "Active" : <span className="font-medium text-red-600">Suspended — link no longer attributes new visitors</span>}
          </p>
        </div>

        {!row.verified && (
          <div className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900">
            <p className="font-medium">
              Not verified yet — nothing can be paid to this partner.
              {partner.selfRegistered
                ? ` Signed up by itself on ${new Date(partner.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}${partner.termsAcceptedAt ? `, partner terms ${partner.termsVersion ?? ""} accepted`.replace("  ", " ") : ""}.`
                : ""}
            </p>
            <p className="mt-1">
              Payout rule: verify the partner (business is genuine, you hold their bank details), then they are paid once at least {formatPenceExact(AFFILIATE_MIN_PAYOUT_PENCE)} is waiting. Shares are only
              ever credited on fees GlowUpp has actually received.
            </p>
          </div>
        )}

        <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Link</h2>
          <CopyLink link={link} />
          <p className="text-sm font-medium">Tradespeople link</p>
          <CopyLink link={proLink} />
          <p className="text-xs text-zinc-500">
            Also works with the short code <code>{partner.referralCode}</code> (…/a/{partner.referralCode}). Visits show in Plausible as source <code>affiliate</code>, campaign{" "}
            <code>{partner.qrSlug}</code>.
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs text-zinc-500">{label}</p>
              <p className={`mt-1 text-lg font-semibold tabular-nums ${label === "Owed" && row.balancePence < 0 ? "text-red-600" : ""}`}>{value}</p>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Payouts</h2>
          <PartnerControls partnerId={partner.id} status={partner.status} balancePence={row.balancePence} verified={row.verified} />
          {partner.payouts.length === 0 ? (
            <p className="text-sm text-zinc-500">Nothing paid out yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 text-sm">
              {partner.payouts.map((p) => (
                <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                  <span className="font-medium tabular-nums">{formatPenceExact(p.amountPence)}</span>
                  <span className="text-zinc-500">
                    {new Date(p.paidAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    {p.paidBy ? ` · ${p.paidBy.name}` : ""}
                    {p.note ? ` · ${p.note}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {blocked.length > 0 && (
          <section className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-red-900">Held back as possible self-referral ({blocked.length})</h2>
            <p className="text-sm text-red-900">
              On these jobs the {"homeowner or the professional"} has the same email or phone number as this partner, so no share was credited. If it is a false alarm, credit it.
            </p>
            <ul className="divide-y divide-red-100 text-sm">
              {blocked.map((b) => (
                <li key={b.projectId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {b.projectTitle} · matched the {b.matched} · would have earned {formatPenceExact(b.wouldHaveEarnedPence)}
                  </span>
                  <form action={releaseSelfReferral.bind(null, partner.id, b.projectId)}>
                    <button type="submit" className="rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-100">
                      Credit anyway
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Marketing assets</h2>
          <AffiliateAssetCanvas
            businessName={partner.businessName}
            businessSlug={partner.qrSlug}
            link={link}
            proLink={proLink}
            categoryHeadline={AFFILIATE_DEFAULT_HEADLINES[partner.category]}
          />
        </section>
      </div>
    </div>
  );
}
