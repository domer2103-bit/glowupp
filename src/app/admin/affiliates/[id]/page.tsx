import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getAffiliatePartner } from "@/lib/data/affiliates";
import { APP_URL } from "@/lib/notifications";
import { AFFILIATE_CATEGORY_LABELS, AFFILIATE_DEFAULT_HEADLINES, buildAffiliateLink } from "@/lib/affiliate";
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

  const stats: [string, string][] = [
    ["Clicks", String(row.clickCount)],
    ["Projects started", String(row.projects)],
    ["Conversions", String(row.conversions)],
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

        {partner.selfRegistered && (
          <p className="rounded-2xl bg-amber-50 px-5 py-3 text-sm text-amber-800">
            Signed up by itself at /partner/join on {new Date(partner.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            {partner.termsAcceptedAt ? `, partner terms accepted ${new Date(partner.termsAcceptedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}. Check the
            business is genuine and collect payment details before the first payout.
          </p>
        )}

        <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Link</h2>
          <CopyLink link={link} />
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
          <PartnerControls partnerId={partner.id} status={partner.status} balancePence={row.balancePence} />
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

        <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Marketing assets</h2>
          <AffiliateAssetCanvas
            businessName={partner.businessName}
            businessSlug={partner.qrSlug}
            link={link}
            categoryHeadline={AFFILIATE_DEFAULT_HEADLINES[partner.category]}
          />
        </section>
      </div>
    </div>
  );
}
