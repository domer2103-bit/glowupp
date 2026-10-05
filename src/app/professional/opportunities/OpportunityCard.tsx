import Link from "next/link";
import { createLeadFeeCheckoutSession } from "@/lib/actions/payments";
import { penceToPounds } from "@/lib/money";
import { privateLeadHref } from "@/lib/pipeline-links";

interface OpportunityCardProps {
  quoteRequest: {
    id: string;
    status: string;
    quoteAmount: number | null;
    quoteTimeline: string | null;
    quoteNotes: string | null;
    selected: boolean;
    transaction: { id: string; feeAmount: number; status: string } | null;
    project: {
      title: string;
      projectType: string;
      postcode: string;
      description: string | null;
      budgetMin: number | null;
      budgetMax: number | null;
      isPrivatePipeline: boolean;
      privatePipelineSession: { id: string } | null;
    };
  };
}

/** Tracks status, messages and payment for a quote request. For an open-market request the quote is already submitted by the time it shows up here; a private client's estimate request may still be waiting for the contractor's quote, which is sent from Private leads. */
export function OpportunityCard({ quoteRequest: qr }: OpportunityCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">{qr.project.title}</span>
        <span className="text-xs text-zinc-500">
          {qr.status}
          {qr.selected && <span className="ml-1 font-medium text-[#3a6694]">★ You were selected</span>}
        </span>
      </div>
      <p className="text-sm text-zinc-500">
        {qr.project.projectType} — {qr.project.postcode}
        {qr.project.budgetMin || qr.project.budgetMax
          ? ` — £${qr.project.budgetMin ? penceToPounds(qr.project.budgetMin) : "?"}–£${qr.project.budgetMax ? penceToPounds(qr.project.budgetMax) : "?"}`
          : ""}
      </p>
      {qr.project.description && <p className="text-sm text-zinc-600">{qr.project.description}</p>}

      <Link href={`/professional/opportunities/${qr.id}`} className="self-start text-xs font-medium text-[#3a6694] underline">
        Messages
      </Link>

      {qr.project.isPrivatePipeline && qr.status === "PENDING" ? (
        <div className="flex flex-col gap-2 rounded-lg border border-[#3a6694]/30 bg-blue-50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="font-medium">Estimate requested — you haven&apos;t sent a quote yet</p>
          <Link
            href={privateLeadHref(qr.project.privatePipelineSession?.id)}
            className="self-start rounded-full bg-[#3a6694] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#2c5075]"
          >
            Send your quote →
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-blue-50 p-3 text-sm">
          <p className="font-medium">Your quote: £{qr.quoteAmount ? penceToPounds(qr.quoteAmount) : "?"}</p>
          {qr.quoteTimeline && <p>Timeline: {qr.quoteTimeline}</p>}
          {qr.quoteNotes && <p>{qr.quoteNotes}</p>}
        </div>
      )}

      {qr.transaction && (
        <div className="flex items-center gap-2">
          <p className="text-xs text-zinc-500">
            Lead fee: £{penceToPounds(qr.transaction.feeAmount)} · {qr.transaction.status}
          </p>
          {qr.transaction.status === "PENDING" && (
            <form action={createLeadFeeCheckoutSession.bind(null, qr.transaction.id)}>
              <button type="submit" className="rounded-full bg-[#3a6694] px-3 py-1 text-xs font-medium text-white hover:bg-[#2c5075]">
                Pay to unlock address
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
