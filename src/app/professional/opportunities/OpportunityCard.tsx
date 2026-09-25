import Link from "next/link";
import { createLeadFeeCheckoutSession } from "@/lib/actions/payments";
import { penceToPounds } from "@/lib/money";

interface OpportunityCardProps {
  quoteRequest: {
    id: string;
    status: string;
    quoteAmount: number | null;
    quoteTimeline: string | null;
    quoteNotes: string | null;
    selected: boolean;
    transaction: { id: string; feeAmount: number; status: string } | null;
    project: { title: string; projectType: string; postcode: string; description: string | null; budgetMin: number | null; budgetMax: number | null };
  };
}

/** Read-only: the quote itself is already submitted (via the open-market browse flow) by the time it shows up here — this just tracks status, messages, and payment. */
export function OpportunityCard({ quoteRequest: qr }: OpportunityCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-300 px-4 py-3 dark:border-zinc-700">
      <div className="flex items-center justify-between">
        <span className="font-medium">{qr.project.title}</span>
        <span className="text-xs text-zinc-500">
          {qr.status}
          {qr.selected && <span className="ml-1 font-medium text-black dark:text-white">★ You were selected</span>}
        </span>
      </div>
      <p className="text-sm text-zinc-500">
        {qr.project.projectType} — {qr.project.postcode}
        {qr.project.budgetMin || qr.project.budgetMax
          ? ` — £${qr.project.budgetMin ? penceToPounds(qr.project.budgetMin) : "?"}–£${qr.project.budgetMax ? penceToPounds(qr.project.budgetMax) : "?"}`
          : ""}
      </p>
      {qr.project.description && <p className="text-sm text-zinc-600 dark:text-zinc-400">{qr.project.description}</p>}

      <Link href={`/professional/opportunities/${qr.id}`} className="self-start text-xs underline">
        Messages
      </Link>

      <div className="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800">
        <p className="font-medium">Your quote: £{qr.quoteAmount ? penceToPounds(qr.quoteAmount) : "?"}</p>
        {qr.quoteTimeline && <p>Timeline: {qr.quoteTimeline}</p>}
        {qr.quoteNotes && <p>{qr.quoteNotes}</p>}
      </div>

      {qr.transaction && (
        <div className="flex items-center gap-2">
          <p className="text-xs text-zinc-500">
            Lead fee: £{penceToPounds(qr.transaction.feeAmount)} · {qr.transaction.status}
          </p>
          {qr.transaction.status === "PENDING" && (
            <form action={createLeadFeeCheckoutSession.bind(null, qr.transaction.id)}>
              <button type="submit" className="rounded-full bg-black px-3 py-1 text-xs text-white dark:bg-white dark:text-black">
                Pay to unlock address
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
