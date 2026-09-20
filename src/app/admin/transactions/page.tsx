import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAllTransactions } from "@/lib/data/admin";
import { updateTransactionStatus } from "@/lib/actions/admin";
import { penceToPounds } from "@/lib/money";
import { UserRole, TransactionStatus } from "@/generated/prisma/client";

const STATUS_OPTIONS = [TransactionStatus.PENDING, TransactionStatus.PAID, TransactionStatus.WAIVED, TransactionStatus.CANCELLED];

export default async function AdminTransactionsPage() {
  await requireRole(UserRole.ADMIN);
  const transactions = await getAllTransactions();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 bg-zinc-50 px-6 py-16 dark:bg-black">
      <div>
        <Link href="/admin" className="text-sm text-zinc-600 underline dark:text-zinc-400">
          ← Admin
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Lead fees</h1>
        <p className="mt-1 text-sm text-zinc-500">
          No live payment processor — mark a fee here once you&apos;ve actually collected it outside this system (bank transfer, invoice,
          etc.).
        </p>
      </div>

      {transactions.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">No lead fees yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {transactions.map((t) => (
            <li key={t.id} className="flex flex-col gap-2 rounded-lg border border-zinc-300 px-4 py-3 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <span className="font-medium">{t.professional.businessName}</span>
                <span className="text-xs text-zinc-500">{t.status}</span>
              </div>
              <p className="text-sm text-zinc-500">
                {t.project.title} · £{penceToPounds(t.feeAmount)} ·{" "}
                {new Date(t.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.filter((s) => s !== t.status).map((s) => (
                  <form key={s} action={updateTransactionStatus.bind(null, t.id, s)}>
                    <button type="submit" className="rounded-full border border-zinc-400 px-3 py-1 text-xs dark:border-zinc-600">
                      Mark {s.toLowerCase()}
                    </button>
                  </form>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
