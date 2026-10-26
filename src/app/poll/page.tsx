import { PollForm } from "./PollForm";
import { pageMetadata } from "@/lib/seo";
import { LEAD_FEE_CAP_PENCE, PRIVATE_LINK_FREE_JOBS } from "@/lib/fees";
import { formatPence } from "@/lib/money";

// A short survey linked from posts, not a page people search for.
export const metadata = pageMetadata({
  title: "Tradespeople: which would you pick? — GlowUpp",
  description: "Pay only when you win a job, or one flat monthly fee? Tell us which you would pick. 20 seconds.",
  path: "/poll",
  noindex: true,
});

export default function PricingPollPage() {
  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-6 py-16 text-center text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />
      <span className="relative mt-4 text-xs font-semibold uppercase tracking-wide text-[#3a6694]">For tradespeople · 20 seconds</span>
      <h1 className="relative mt-3 max-w-xl text-3xl font-bold leading-tight sm:text-4xl">How would you like to pay for GlowUpp?</h1>
      <p className="relative mt-3 max-w-md text-zinc-600">
        You&apos;re the boss, so you choose. Tell us which you&apos;d pick and we&apos;ll build what tradespeople actually want.
      </p>
      <div className="relative mt-8 flex w-full justify-center">
        <PollForm
          commissionText={`2% of the accepted quote, only when a client picks you (max ${formatPence(LEAD_FEE_CAP_PENCE)}). Nothing to pay in a quiet month.`}
          subscriptionText="One fixed price a month and no commission on your jobs. Predictable, whether you win one job or ten. (Not available yet.)"
        />
      </div>
      <p className="relative mt-8 max-w-md text-xs text-zinc-500">
        This is a survey only. Nothing changes today: GlowUpp is free to join, you pay 2% only when you win a job, and your first {PRIVATE_LINK_FREE_JOBS} jobs from your own
        clients are free. Votes are anonymous.
      </p>
    </div>
  );
}
