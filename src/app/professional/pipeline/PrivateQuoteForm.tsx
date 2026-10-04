"use client";

import { useActionState, useState } from "react";
import { submitPrivateQuote } from "@/lib/actions/private-pipeline";
import type { ActionState } from "@/lib/actions/quotes";

type Row = { description: string; amount: string };

const INPUT = "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm";

export function PrivateQuoteForm(props: {
  sessionId: string;
  initialItems: { description: string; amountPence: number }[];
  initialTimeline: string;
  initialNotes: string;
  initialDepositPence: number | null;
  alreadyQuoted: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(
    props.initialItems.length > 0 ? props.initialItems.map((i) => ({ description: i.description, amount: (i.amountPence / 100).toFixed(2) })) : [{ description: "", amount: "" }]
  );
  const boundAction = submitPrivateQuote.bind(null, props.sessionId);
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(boundAction, undefined);
  const [sent, setSent] = useState(false);

  const total = rows.reduce((sum, r) => sum + (Number.isFinite(Number(r.amount)) ? Math.max(0, Number(r.amount)) : 0), 0);
  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <form
      action={async (fd) => {
        await dispatch(fd);
        setSent(true);
      }}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2">
            <input name="itemDescription" value={row.description} onChange={(e) => update(i, { description: e.target.value })} placeholder="Item (e.g. Fit 8 base units)" className={`${INPUT} min-w-0 flex-1`} maxLength={200} />
            <input name="itemAmount" value={row.amount} onChange={(e) => update(i, { amount: e.target.value })} placeholder="£" inputMode="decimal" className={`${INPUT} w-28 shrink-0`} />
            {rows.length > 1 && (
              <button type="button" aria-label="Remove line" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))} className="px-2 text-zinc-400 hover:text-red-600">
                ✕
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => setRows((rs) => [...rs, { description: "", amount: "" }])} className="self-start text-xs font-medium text-[#3a6694] underline">
          + Add line
        </button>
      </div>

      <p className="text-sm font-medium">Total: £{total.toFixed(2)}</p>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          Estimated timeline
          <input name="quoteTimeline" defaultValue={props.initialTimeline} placeholder="e.g. 2 weeks" className={INPUT} required />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          Deposit to request (optional, £)
          <input name="deposit" defaultValue={props.initialDepositPence ? (props.initialDepositPence / 100).toFixed(2) : ""} inputMode="decimal" placeholder="e.g. 500" className={INPUT} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs text-zinc-600">
        Notes for the client (optional)
        <textarea name="quoteNotes" defaultValue={props.initialNotes} rows={2} maxLength={2000} className={`${INPUT} w-full`} />
      </label>
      <p className="text-xs text-zinc-500">A deposit is a request only: the client pays you directly. GlowUpp doesn&apos;t take or hold it.</p>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-full bg-[#3a6694] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2c5075] disabled:opacity-50">
          {pending ? "Sending…" : props.alreadyQuoted ? "Update & resend quote" : "Send quote"}
        </button>
        {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
        {sent && !pending && !state?.error && <p className="text-xs text-emerald-700">Quote sent ✓</p>}
      </div>
    </form>
  );
}
