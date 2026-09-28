import Link from "next/link";
import { getProfessionalTransactions } from "@/lib/data/transactions";
import { createLeadFeeCheckoutSession } from "@/lib/actions/payments";
import { penceToPounds } from "@/lib/money";

export default async function ProfessionalTransactionsPage() {
  const transactions = await getProfessionalTransactions();
  const totalOwed = transactions.filter((t) => t.status === "PENDING").reduce((sum, t) => sum + t.feeAmount, 0);

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-6 py-16 text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />

      <div className="relative flex w-full max-w-2xl flex-col gap-6">
        <div>
          <Link href="/dashboard" className="text-sm text-zinc-600 underline">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Lead fees</h1>
          <p className="mt-1 text-sm text-zinc-500">
            GlowUpp&apos;s fee for a project you&apos;ve won — not a payment to the homeowner, and not something they see. 5% of the
            accepted quote, capped at £250. Paying unlocks the homeowner&apos;s full address on the opportunity.
          </p>
        </div>

        {totalOwed > 0 && <p className="text-sm font-medium">Outstanding: £{penceToPounds(totalOwed)}</p>}

        {transactions.length === 0 ? (
          <p className="text-zinc-600">No lead fees yet — these appear once you&apos;re selected for a project.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
                <div>
                  <p className="font-medium">{t.project.title}</p>
                  <p className="text-xs text-zinc-500">
                    {new Date(t.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-medium">£{penceToPounds(t.feeAmount)}</p>
                    <p className="text-xs text-zinc-500">{t.status}</p>
                  </div>
                  {t.status === "PENDING" && (
                    <form action={createLeadFeeCheckoutSession.bind(null, t.id)}>
                      <button type="submit" className="rounded-full bg-[#3a6694] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2c5075]">
                        Pay now
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
