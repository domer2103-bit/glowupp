import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAffiliateOverview } from "@/lib/data/affiliates";
import { AFFILIATE_CATEGORY_LABELS } from "@/lib/affiliate";
import { formatPenceExact } from "@/lib/money";
import { AffiliateStatus, UserRole } from "@/generated/prisma/client";
import { NewAffiliateForm } from "./NewAffiliateForm";
import { PartnerControls } from "./PartnerControls";

const TH = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500";
const TD = "px-3 py-3 align-top text-sm";

export default async function AdminAffiliatesPage() {
  await requireRole(UserRole.ADMIN);
  const partners = await getAffiliateOverview();

  const totals = partners.reduce(
    (t, p) => ({ gmv: t.gmv + p.gmvPence, profit: t.profit + p.glowuppProfitPence, owed: t.owed + Math.max(0, p.balancePence) }),
    { gmv: 0, profit: 0, owed: 0 }
  );

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-6 py-16 text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />

      <div className="relative flex w-full max-w-6xl flex-col gap-8">
        <div>
          <Link href="/admin" className="text-sm text-zinc-600 underline">
            ← Admin
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Partner program</h1>
          <p className="mt-1 max-w-3xl text-sm text-zinc-500">
            Local businesses and influencers who share GlowUpp. A partner earns half of the lead fee GlowUpp actually collects on jobs from homeowners who came through their
            link or QR. Payouts are made outside this system (bank transfer) — record them here once sent.
          </p>
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Create new B2B partner</h2>
          <NewAffiliateForm />
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">Partners ({partners.length})</h2>
            {partners.length > 0 && (
              <p className="text-sm text-zinc-500">
                Job value {formatPenceExact(totals.gmv)} · GlowUpp fees collected {formatPenceExact(totals.profit)} · Owed to partners {formatPenceExact(totals.owed)}
              </p>
            )}
          </div>

          {partners.length === 0 ? (
            <p className="text-zinc-600">No partners yet. Create the first one above.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <table className="w-full min-w-[60rem] border-collapse">
                <thead className="border-b border-zinc-200 bg-zinc-50">
                  <tr>
                    <th className={TH}>Partner</th>
                    <th className={`${TH} text-right`}>Clicks</th>
                    <th className={`${TH} text-right`}>Projects</th>
                    <th className={`${TH} text-right`}>Conversions</th>
                    <th className={`${TH} text-right`}>Job value</th>
                    <th className={`${TH} text-right`}>GlowUpp profit</th>
                    <th className={`${TH} text-right`}>Partner share</th>
                    <th className={`${TH} text-right`}>Owed</th>
                    <th className={TH}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {partners.map((p) => (
                    <tr key={p.id} className={p.status === AffiliateStatus.SUSPENDED ? "bg-zinc-50 text-zinc-500" : undefined}>
                      <td className={TD}>
                        <Link href={`/admin/affiliates/${p.id}`} className="font-medium text-[#3a6694] underline">
                          {p.businessName}
                        </Link>
                        <p className="text-xs text-zinc-500">
                          {AFFILIATE_CATEGORY_LABELS[p.category]} · {p.contactName} ·{" "}
                          {p.status === AffiliateStatus.ACTIVE ? "Active" : <span className="font-medium text-red-600">Suspended</span>}
                          {p.selfRegistered && <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">Self-registered — vet before paying</span>}
                        </p>
                      </td>
                      <td className={`${TD} text-right tabular-nums`}>{p.clickCount}</td>
                      <td className={`${TD} text-right tabular-nums`}>{p.projects}</td>
                      <td className={`${TD} text-right tabular-nums`}>{p.conversions}</td>
                      <td className={`${TD} text-right tabular-nums`}>{formatPenceExact(p.gmvPence)}</td>
                      <td className={`${TD} text-right tabular-nums`}>{formatPenceExact(p.glowuppProfitPence)}</td>
                      <td className={`${TD} text-right tabular-nums`}>
                        {formatPenceExact(p.totalEarningsPence)}
                        <p className="text-xs text-zinc-500">{formatPenceExact(p.paidEarningsPence)} paid</p>
                      </td>
                      <td className={`${TD} text-right font-medium tabular-nums ${p.balancePence < 0 ? "text-red-600" : ""}`}>{formatPenceExact(p.balancePence)}</td>
                      <td className={TD}>
                        <PartnerControls partnerId={p.id} status={p.status} balancePence={p.balancePence} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-zinc-500">
            Clicks are raw link opens (bots and repeat scans included). Conversions are jobs where the homeowner picked a professional. Partner share is credited when the
            professional&apos;s lead fee is paid, and withdrawn if that fee is later reversed. First partner a homeowner opens wins, for 30 days.
          </p>
        </section>
      </div>
    </div>
  );
}
