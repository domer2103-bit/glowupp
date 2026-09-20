"use client";

import Link from "next/link";
import { useActionState } from "react";
import { declineQuoteRequest, submitQuote, type ActionState } from "@/lib/actions/quotes";
import { penceToPounds } from "@/lib/money";

interface OpportunityCardProps {
  quoteRequest: {
    id: string;
    status: string;
    message: string | null;
    quoteAmount: number | null;
    quoteTimeline: string | null;
    quoteNotes: string | null;
    selected: boolean;
    transaction: { feeAmount: number; status: string } | null;
    project: { title: string; projectType: string; postcode: string; description: string | null; budgetMin: number | null; budgetMax: number | null };
  };
}

export function OpportunityCard({ quoteRequest: qr }: OpportunityCardProps) {
  const quoteAction = submitQuote.bind(null, qr.id);
  const [quoteState, quoteDispatch, quotePending] = useActionState<ActionState, FormData>(quoteAction, undefined);

  const canRespond = qr.status === "PENDING" || qr.status === "VIEWED";

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
      {qr.message && <p className="text-sm text-zinc-600 dark:text-zinc-400">Homeowner&apos;s note: {qr.message}</p>}

      <Link href={`/professional/opportunities/${qr.id}`} className="self-start text-xs underline">
        Messages
      </Link>

      {qr.status === "QUOTED" && (
        <div className="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800">
          <p className="font-medium">Your quote: £{qr.quoteAmount ? penceToPounds(qr.quoteAmount) : "?"}</p>
          {qr.quoteTimeline && <p>Timeline: {qr.quoteTimeline}</p>}
          {qr.quoteNotes && <p>{qr.quoteNotes}</p>}
        </div>
      )}

      {qr.transaction && (
        <p className="text-xs text-zinc-500">
          Lead fee: £{penceToPounds(qr.transaction.feeAmount)} · {qr.transaction.status}
        </p>
      )}

      {canRespond && (
        <div className="flex flex-col gap-2">
          <form action={declineQuoteRequest.bind(null, qr.id)}>
            <button type="submit" className="text-xs text-red-600 underline">
              Decline
            </button>
          </form>

          <form action={quoteDispatch} className="flex flex-col gap-2 rounded border border-zinc-200 p-3 dark:border-zinc-800">
            <span className="text-xs font-medium">Submit a quote</span>
            <input name="quoteAmount" type="number" min="0" placeholder="Amount (£)" required className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
            <input name="quoteTimeline" placeholder="Estimated timeline (e.g. 3-4 weeks)" required className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
            <textarea name="quoteNotes" placeholder="Notes (optional)" className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
            {quoteState?.error && <p className="text-xs text-red-600">{quoteState.error}</p>}
            <button type="submit" disabled={quotePending} className="self-start rounded-full bg-black px-3 py-1 text-xs text-white disabled:opacity-50 dark:bg-white dark:text-black">
              {quotePending ? "Submitting…" : "Submit quote"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
