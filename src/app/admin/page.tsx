import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAllProfessionals, getAllTransactions, getAllWaitlistSignups } from "@/lib/data/admin";
import { getAffiliateOverview } from "@/lib/data/affiliates";
import { UserRole, VerificationStatus, TransactionStatus } from "@/generated/prisma/client";

const CARD_CLASS =
  "flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md";

export default async function AdminHubPage() {
  await requireRole(UserRole.ADMIN);

  const [professionals, transactions, waitlistSignups, affiliates] = await Promise.all([
    getAllProfessionals(),
    getAllTransactions(),
    getAllWaitlistSignups(),
    getAffiliateOverview(),
  ]);
  const owedToPartners = affiliates.filter((a) => a.balancePence > 0).length;
  const unverifiedCount = professionals.filter((p) => p.verificationStatus === VerificationStatus.UNVERIFIED).length;
  const pendingFeesCount = transactions.filter((t) => t.status === TransactionStatus.PENDING).length;

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-6 py-16 text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />

      <div className="relative flex w-full max-w-2xl flex-col gap-6">
        <div>
          <Link href="/dashboard" className="text-sm text-zinc-600 underline">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Admin</h1>
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/admin/professionals" className={CARD_CLASS}>
            <span className="font-medium">Professionals</span>
            <span className="text-sm text-zinc-500">{unverifiedCount} unverified</span>
          </Link>
          <Link href="/admin/transactions" className={CARD_CLASS}>
            <span className="font-medium">Lead fees</span>
            <span className="text-sm text-zinc-500">{pendingFeesCount} pending</span>
          </Link>
          <Link href="/admin/affiliates" className={CARD_CLASS}>
            <span className="font-medium">Partner program</span>
            <span className="text-sm text-zinc-500">
              {affiliates.length} partners{owedToPartners > 0 ? ` · ${owedToPartners} to pay` : ""}
            </span>
          </Link>
          <Link href="/admin/waitlist" className={CARD_CLASS}>
            <span className="font-medium">Launch waitlist</span>
            <span className="text-sm text-zinc-500">{waitlistSignups.length} signed up</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
