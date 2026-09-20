import Link from "next/link";
import { getProfessionalTransactions } from "@/lib/data/transactions";
import { createLeadFeeCheckoutSession } from "@/lib/actions/payments";
import { penceToPounds } from "@/lib/money";

export default async function ProfessionalTransactionsPage() {
  const transactions = await getProfessionalTransactions();
  const totalOwed = transactions.filter((t) => t.status === "PENDING").reduce((sum, t) => sum + t.feeAmount, 0);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 bg-zinc-50 px-6 py-16 dark:bg-black">
      <div>
        <Link href="/dashboard" className="text-sm text-zinc-600 underline dark:text-zinc-400">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Lead fees</h1>
        <p className="mt-1 text-sm text-zinc-500">
          GlowUpp&apos;s fee for a project you&apos;ve won — not a payment to the homeowner, and not something they see. 5% of the
          accepted quote, capped at £250. Paying unlocks the homeowner&apos;s full address on the opportunity.
        </p>
      </div>

      {totalOwed > 0 && (
        <p className="text-sm font-medium">
          Outstanding: £{penceToPounds(totalOwed)}
        </p>
      )}

      {transactions.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">No lead fees yet — these appear once you&apos;re selected for a project.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {transactions.map((t) => (
            <li key={t.id} className="flex items-center justify-between rounded-lg border border-zinc-300 px-4 py-3 dark:border-zinc-700">
              <div>
                <p className="font-medium">{t.project.title}</p>
                <p className="text-xs text-zinc-500">{new Date(t.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-medium">£{penceToPounds(t.feeAmount)}</p>
                  <p className="text-xs text-zinc-500">{t.status}</p>
                </div>
                {t.status === "PENDING" && (
                  <form action={createLeadFeeCheckoutSession.bind(null, t.id)}>
                    <button type="submit" className="rounded-full bg-black px-3 py-1.5 text-xs text-white dark:bg-white dark:text-black">
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
  );
}
