import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAllProfessionals, getAllTransactions } from "@/lib/data/admin";
import { UserRole, VerificationStatus, TransactionStatus } from "@/generated/prisma/client";

export default async function AdminHubPage() {
  await requireRole(UserRole.ADMIN);

  const [professionals, transactions] = await Promise.all([getAllProfessionals(), getAllTransactions()]);
  const unverifiedCount = professionals.filter((p) => p.verificationStatus === VerificationStatus.UNVERIFIED).length;
  const pendingFeesCount = transactions.filter((t) => t.status === TransactionStatus.PENDING).length;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 bg-zinc-50 px-6 py-16 dark:bg-black">
      <div>
        <Link href="/dashboard" className="text-sm text-zinc-600 underline dark:text-zinc-400">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Admin</h1>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/admin/professionals"
          className="flex items-center justify-between rounded-lg border border-zinc-300 px-4 py-3 dark:border-zinc-700"
        >
          <span className="font-medium">Professionals</span>
          <span className="text-sm text-zinc-500">{unverifiedCount} unverified</span>
        </Link>
        <Link
          href="/admin/transactions"
          className="flex items-center justify-between rounded-lg border border-zinc-300 px-4 py-3 dark:border-zinc-700"
        >
          <span className="font-medium">Lead fees</span>
          <span className="text-sm text-zinc-500">{pendingFeesCount} pending</span>
        </Link>
      </div>
    </div>
  );
}
