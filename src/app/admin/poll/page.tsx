import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAdminPollResults } from "@/lib/data/pricing-poll";
import { POLL_PRICE_OPTIONS, percent, type PricingTally } from "@/lib/pricing-poll";
import { UserRole } from "@/generated/prisma/client";

function Bar({ label, count, total }: { label: string; count: number; total: number }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-44 shrink-0 text-zinc-700">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full rounded-full bg-[#3a6694]" style={{ width: `${percent(count, total)}%` }} />
      </div>
      <span className="w-20 shrink-0 text-right text-zinc-500">
        {count} · {percent(count, total)}%
      </span>
    </div>
  );
}

function Split({ t }: { t: PricingTally }) {
  return (
    <div className="flex flex-col gap-2">
      <Bar label="Pay when you win (2%)" count={t.commission} total={t.total} />
      <Bar label="Flat monthly fee" count={t.subscription} total={t.total} />
    </div>
  );
}

export default async function AdminPollPage() {
  await requireRole(UserRole.ADMIN);
  const { tally, bySource, latest } = await getAdminPollResults();
  const priceAnswers = Object.values(tally.byPrice).reduce((a, b) => a + b, 0);

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-6 py-16 text-[#132a4d]">
      <div className="relative flex w-full max-w-2xl flex-col gap-6">
        <div>
          <Link href="/admin" className="text-sm text-zinc-600 underline">
            ← Admin
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Pricing poll (/poll)</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {tally.total} votes{latest ? `, latest ${new Date(latest).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}. Anonymous, one per browser.
          </p>
        </div>

        {tally.total === 0 ? (
          <p className="text-zinc-600">No votes yet. Share the link: glowupp.co.uk/poll</p>
        ) : (
          <>
            <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold">Which would they pick?</h2>
              <Split t={tally} />
            </section>

            <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold">Monthly price they would pay ({priceAnswers} answered)</h2>
              {POLL_PRICE_OPTIONS.map((o) => (
                <Bar key={o.value} label={o.label.split(" — ")[0]} count={tally.byPrice[o.value] ?? 0} total={priceAnswers} />
              ))}
            </section>

            <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold">By where they came from</h2>
              {Object.entries(bySource)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([label, t]) => (
                  <div key={label} className="flex flex-col gap-2 border-t border-zinc-100 pt-3 first:border-0 first:pt-0">
                    <span className="text-sm font-medium">
                      {label} <span className="font-normal text-zinc-500">({t.total})</span>
                    </span>
                    <Split t={t} />
                  </div>
                ))}
            </section>

            {Object.keys(tally.byTrade).length > 0 && (
              <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold">Trades that said</h2>
                {Object.entries(tally.byTrade)
                  .sort((a, b) => b[1] - a[1])
                  .map(([trade, n]) => (
                    <Bar key={trade} label={trade} count={n} total={Object.values(tally.byTrade).reduce((a, b) => a + b, 0)} />
                  ))}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
