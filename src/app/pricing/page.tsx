import { pageMetadata } from "@/lib/seo";
import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getProfessionalSubscription } from "@/lib/data/subscriptions";
import { startProCheckout } from "@/lib/actions/subscription";
import { LEAD_FEE_CAP_PENCE, LEAD_FEE_RATE } from "@/lib/fees";
import { breakEvenQuotePence, isProActive } from "@/lib/plans";
import { formatPence } from "@/lib/money";
import { PricingCards, type PricingViewer } from "./PricingCards";

export const metadata = pageMetadata({
  title: "Pricing for tradespeople | GlowUpp",
  description: "Free to join, pay only when a homeowner picks you. Go Pro for no fee on your own clients. Plans for tradespeople on GlowUpp.",
  path: "/pricing",
});

async function viewerKind(): Promise<PricingViewer> {
  const user = await getCurrentUser();
  if (!user) return "guest";
  if (user.role !== UserRole.PROFESSIONAL) return "other";
  const professional = await prisma.professional.findUnique({ where: { userId: user.id } });
  if (!professional) return "professional";
  return isProActive(await getProfessionalSubscription(professional.id)) ? "pro" : "professional";
}

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const { cancelled } = await searchParams;
  const viewer = await viewerKind();
  const rate = `${Math.round(LEAD_FEE_RATE * 100)}%`;
  const feeText = `${rate} of the accepted quote when you win a marketplace job (max ${formatPence(LEAD_FEE_CAP_PENCE)})`;
  const breakEvenText = `Pro pays for itself once your own clients accept about ${formatPence(breakEvenQuotePence())} of quotes in a month (after your first 3 free own-client jobs): above that, the ${rate} fee would cost more than the plan.`;

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-6 py-16 text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />
      <div className="relative mx-auto w-full max-w-5xl">
        <span className="block text-center text-xs font-semibold uppercase tracking-wide text-[#3a6694]">For tradespeople</span>
        <h1 className="mx-auto mt-3 max-w-2xl text-center text-3xl font-bold leading-tight sm:text-4xl">Win more jobs. Keep more of what you earn.</h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-zinc-600">
          Start free and pay only when you win a job. Go Pro when you bring your own clients and want no fee on them, plus a stronger profile.
        </p>
        {cancelled && <p role="status" className="mx-auto mt-6 max-w-md rounded-2xl bg-zinc-100 px-4 py-3 text-center text-sm text-zinc-700">No problem. Nothing was charged.</p>}

        <PricingCards viewer={viewer} startCheckout={startProCheckout} feeText={feeText} breakEvenText={breakEvenText} />

        <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-zinc-200 bg-white p-5 text-center text-sm leading-relaxed shadow-sm">
          <strong>One rule on every plan:</strong> when a homeowner picks you through the GlowUpp marketplace, GlowUpp&apos;s fee is {rate} of the accepted quote, capped at {formatPence(LEAD_FEE_CAP_PENCE)}. Pro doesn&apos;t change that. It removes the fee on clients <em>you</em> bring through your own link or QR code.
        </div>

        <h2 className="mt-14 text-2xl font-bold">Questions</h2>
        <div className="mt-4 flex flex-col gap-3 text-left">
          <details className="rounded-2xl border border-zinc-200 bg-white p-4" open>
            <summary className="cursor-pointer font-semibold">What counts as an &ldquo;own client&rdquo;?</summary>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">Anyone who comes to GlowUpp through your own private link or QR code and picks you. On Pro you pay no fee on those jobs, however many there are.</p>
          </details>
          <details className="rounded-2xl border border-zinc-200 bg-white p-4">
            <summary className="cursor-pointer font-semibold">Can I cancel?</summary>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">Yes, any time from your plan page. It stays active until the end of the period you have paid for, then stops. There is no lock-in.</p>
          </details>
          <details className="rounded-2xl border border-zinc-200 bg-white p-4">
            <summary className="cursor-pointer font-semibold">What does &ldquo;launch price, locked in&rdquo; mean?</summary>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">The price you subscribe at is the price you keep paying for as long as you stay subscribed, even when the list price applies to new members. If you cancel and come back later, the price at that time applies.</p>
          </details>
          <details className="rounded-2xl border border-zinc-200 bg-white p-4">
            <summary className="cursor-pointer font-semibold">When will Max be available?</summary>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">We&apos;re building it and it isn&apos;t on sale yet. We won&apos;t charge for anything that isn&apos;t working. The planned price is shown for information.</p>
          </details>
          <details className="rounded-2xl border border-zinc-200 bg-white p-4">
            <summary className="cursor-pointer font-semibold">Is the homeowner charged anything?</summary>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">No. GlowUpp is free for homeowners.</p>
          </details>
        </div>
        <p className="mt-8 text-center text-xs text-zinc-500">Prices are in pounds sterling. GlowUpp is not VAT registered, so no VAT is added.</p>
      </div>
    </div>
  );
}
