import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/client";
import { getProfessionalSubscription } from "@/lib/data/subscriptions";
import { isProActive } from "@/lib/plans";
import { formatPenceExact } from "@/lib/money";
import { openBillingPortal, setProCancellation } from "@/lib/actions/subscription";
import { AutoRefresh } from "@/components/AutoRefresh";

export default async function ProfessionalPlanPage({ searchParams }: { searchParams: Promise<{ started?: string; cancelling?: string; resumed?: string; portal_error?: string }> }) {
  const sp = await searchParams;
  const user = await requireRole(UserRole.PROFESSIONAL);
  const professional = await prisma.professional.findUnique({ where: { userId: user.id } });
  if (!professional) redirect("/professional/onboarding");
  const sub = await getProfessionalSubscription(professional.id);
  const active = isProActive(sub);
  const endDate = sub?.currentPeriodEnd?.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  // Back from Stripe but our webhook has not recorded the plan yet: keep checking for a few seconds.
  const settingUp = sp.started === "1" && !sub;

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-6 py-16 text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />
      {settingUp && <AutoRefresh everyMs={3000} />}
      <div className="relative flex w-full max-w-2xl flex-col gap-6">
        <div>
          <Link href="/dashboard" className="text-sm text-zinc-600 underline">← Dashboard</Link>
          <h1 className="mt-2 text-2xl font-semibold">Your plan</h1>
        </div>

        {settingUp && <p role="status" className="rounded-2xl bg-blue-50 px-4 py-3 text-sm">Thanks. We&apos;re confirming your payment with Stripe, this page updates by itself in a few seconds.</p>}
        {sp.cancelling && <p role="status" className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm">Your plan will stop renewing. You keep Pro until {endDate ?? "the end of this period"}.</p>}
        {sp.resumed && <p role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Welcome back. Your plan will renew as normal.</p>}
        {sp.portal_error && <p role="alert" className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">We couldn&apos;t open the billing page just now. Email <a className="underline" href="mailto:hello@glowupp.co.uk">hello@glowupp.co.uk</a> and we&apos;ll sort it.</p>}

        {sub && active ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="flex items-center gap-2 text-lg font-semibold">GlowUpp Pro <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-[#2c5075]">Active</span></p>
            <p className="text-sm text-zinc-600">
              {formatPenceExact(sub.unitAmountPence)} {sub.interval === "YEAR" ? "a year" : "a month"}, the price you subscribed at.
              {sub.status === "PAST_DUE" && " Your last payment didn't go through. Please update your card so you don't lose Pro."}
            </p>
            <p className="text-sm text-zinc-600">
              {sub.cancelAtPeriodEnd ? `Ends on ${endDate ?? "the end of this period"}. It won't renew.` : `Renews on ${endDate ?? "your next billing date"}.`}
            </p>
            <ul className="list-disc pl-5 text-sm text-zinc-600">
              <li>No fee on your own clients, however many jobs</li>
              <li>Pro badge on your quotes, and listed higher when homeowners compare quotes</li>
            </ul>
            <div className="mt-2 flex flex-wrap gap-3">
              <form action={openBillingPortal}><button type="submit" className="rounded-full border border-[#3a6694] px-4 py-2 text-sm font-semibold text-[#3a6694] hover:bg-blue-50">Change card or see invoices</button></form>
              {sub.cancelAtPeriodEnd ? (
                <form action={setProCancellation.bind(null, false)}><button type="submit" className="rounded-full bg-[#3a6694] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2c5075]">Keep my plan</button></form>
              ) : (
                <form action={setProCancellation.bind(null, true)}><button type="submit" className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">Cancel at end of period</button></form>
              )}
            </div>
          </div>
        ) : !settingUp ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-lg font-semibold">You&apos;re on Pay as you win</p>
            <p className="text-sm text-zinc-600">Free profile. 2% of the accepted quote (max £250) when you win a marketplace job, and your first 3 own-client jobs are free. {sub && "Your Pro plan has ended."}</p>
            <Link href="/pricing" className="self-start rounded-full bg-[#3a6694] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2c5075]">See Pro</Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
