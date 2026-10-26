"use client";

import { useActionState, useState } from "react";
import { submitPricingPoll, type PollState } from "@/lib/actions/pricing-poll";
import { POLL_PRICE_OPTIONS, POLL_TRADES, type PollChoice } from "@/lib/pricing-poll";

const CARD = "flex cursor-pointer flex-col gap-2 rounded-2xl border-2 bg-white p-6 text-left shadow-sm transition";

export function PollForm({ commissionText, subscriptionText }: { commissionText: string; subscriptionText: string }) {
  const [state, action, pending] = useActionState<PollState, FormData>(submitPricingPoll, undefined);
  const [choice, setChoice] = useState<PollChoice | null>(null);

  if (state?.success) {
    return (
      <div className="flex w-full max-w-xl flex-col items-center gap-3 rounded-2xl border border-[#3a6694] bg-blue-50 px-6 py-8 text-center">
        <span className="text-2xl">✓</span>
        <p className="text-lg font-semibold text-[#132a4d]">Thanks, your vote is in.</p>
        {state.results ? (
          <p className="text-sm text-zinc-700">
            So far {state.results.total} tradespeople have voted: <strong>{state.results.commissionPct}%</strong> picked pay-as-you-win,{" "}
            <strong>{state.results.subscriptionPct}%</strong> picked a flat monthly fee.
          </p>
        ) : (
          <p className="text-sm text-zinc-700">We&apos;ll share the results once enough tradespeople have voted.</p>
        )}
        <p className="text-sm text-zinc-600">Nothing changes today: you still only pay when you win a job.</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex w-full max-w-xl flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={`${CARD} ${choice === "commission" ? "border-[#3a6694] ring-2 ring-[#3a6694]/30" : "border-zinc-200 hover:border-blue-300"}`}>
          <input type="radio" name="choice" value="commission" className="sr-only" onChange={() => setChoice("commission")} required />
          <span className="text-xs font-semibold uppercase tracking-wide text-[#3a6694]">Option A</span>
          <span className="text-lg font-bold text-[#132a4d]">Pay when you win</span>
          <span className="text-sm text-zinc-600">{commissionText}</span>
        </label>
        <label className={`${CARD} ${choice === "subscription" ? "border-[#3a6694] ring-2 ring-[#3a6694]/30" : "border-zinc-200 hover:border-blue-300"}`}>
          <input type="radio" name="choice" value="subscription" className="sr-only" onChange={() => setChoice("subscription")} />
          <span className="text-xs font-semibold uppercase tracking-wide text-[#3a6694]">Option B</span>
          <span className="text-lg font-bold text-[#132a4d]">One flat monthly fee</span>
          <span className="text-sm text-zinc-600">{subscriptionText}</span>
        </label>
      </div>

      {choice && (
        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-sm">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold text-[#132a4d]">
              {choice === "subscription" ? "What monthly price would feel fair?" : "Would a flat monthly fee ever tempt you? At what price?"}{" "}
              <span className="font-normal text-zinc-500">(optional)</span>
            </legend>
            {POLL_PRICE_OPTIONS.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm text-zinc-700">
                <input type="radio" name="price" value={o.value} className="h-4 w-4 accent-[#3a6694]" /> {o.label}
              </label>
            ))}
          </fieldset>
          <label className="flex flex-col gap-1 text-sm font-semibold text-[#132a4d]">
            <span>
              Your trade <span className="font-normal text-zinc-500">(optional)</span>
            </span>
            <select name="trade" defaultValue="" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-normal text-zinc-700">
              <option value="">Prefer not to say</option>
              {POLL_TRADES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <button type="submit" disabled={pending || !choice} className="rounded-full bg-[#3a6694] px-6 py-3 text-sm font-medium text-white hover:bg-[#2c5075] disabled:opacity-50">
        {pending ? "Sending…" : "Send my vote"}
      </button>
      {state?.error && <p className="text-center text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
