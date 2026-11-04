"use client";

import Link from "next/link";
import { useState } from "react";
import {
  MAX_LAUNCH_PRICE_PENCE,
  MAX_LIST_PRICE_PENCE,
  PRO_LAUNCH_PRICE_PENCE,
  PRO_LIST_PRICE_PENCE,
  type BillingIntervalKey,
} from "@/lib/plans";
import { formatPence, formatPenceExact } from "@/lib/money";

/** What the viewer can do on this page: not signed in, a professional on the free plan, a professional already on Pro, or someone else (a homeowner or admin). */
export type PricingViewer = "guest" | "professional" | "pro" | "other";

const tick = "relative pl-6 before:absolute before:left-0 before:top-1 before:h-4 before:w-4 before:rounded-full before:bg-blue-100 after:absolute after:left-[5px] after:top-[6px] after:h-[7px] after:w-[4px] after:rotate-45 after:border-b-2 after:border-r-2 after:border-[#3a6694]";

export function PricingCards({
  viewer,
  startCheckout,
  feeText,
  breakEvenText,
}: {
  viewer: PricingViewer;
  startCheckout: (formData: FormData) => Promise<void>;
  feeText: string;
  breakEvenText: string;
}) {
  const [interval, setInterval] = useState<BillingIntervalKey>("month");
  const perYear = interval === "year";
  const proPerMonthText = perYear ? `That's ${formatPenceExact(Math.round(PRO_LAUNCH_PRICE_PENCE.year / 12))} a month: 2 months free` : "Cancel any time";

  return (
    <div>
      <div className="mt-8 flex justify-center">
        <div className="inline-flex rounded-full border border-zinc-200 bg-white p-1 text-sm font-semibold" role="group" aria-label="Billing period">
          <button type="button" onClick={() => setInterval("month")} aria-pressed={!perYear} className={`rounded-full px-5 py-2 ${!perYear ? "bg-[#132a4d] text-white" : "text-zinc-600"}`}>
            Monthly
          </button>
          <button type="button" onClick={() => setInterval("year")} aria-pressed={perYear} className={`rounded-full px-5 py-2 ${perYear ? "bg-[#132a4d] text-white" : "text-zinc-600"}`}>
            Yearly <span className={perYear ? "text-emerald-300" : "text-emerald-700"}>2 months free</span>
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 items-stretch gap-5 text-left lg:grid-cols-3">
        {/* Free */}
        <section className="flex flex-col rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Pay as you win</h2>
          <p className="mt-1 min-h-10 text-sm text-zinc-600">Start with no monthly cost. You only pay when a homeowner picks you.</p>
          <p className="mt-5 flex items-baseline gap-1"><span className="text-5xl font-bold tracking-tight">£0</span><span className="text-sm text-zinc-500">/month</span></p>
          <p className="min-h-5 text-xs text-zinc-500">No card needed</p>
          <Link href={viewer === "guest" ? "/signup?role=professional" : "/dashboard"} className="mt-5 block rounded-full border-[1.5px] border-[#3a6694] px-4 py-3 text-center text-sm font-bold text-[#3a6694] hover:bg-[#3a6694] hover:text-white">
            {viewer === "guest" ? "Create free profile" : "Go to your dashboard"}
          </Link>
          <ul className="mt-6 flex flex-col gap-3 text-sm">
            <li className={tick}>Free profile and portfolio</li>
            <li className={tick}>Quote on homeowner projects</li>
            <li className={tick}>{feeText}</li>
            <li className={tick}>Your first 3 own-client jobs are free, then 2%</li>
          </ul>
        </section>

        {/* Pro */}
        <section className="relative flex flex-col rounded-3xl border-2 border-[#3a6694] bg-white p-6 shadow-xl shadow-blue-900/10 lg:-translate-y-2">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#3a6694] px-4 py-1 text-xs font-bold text-white">Most popular</span>
          <h2 className="text-xl font-bold">Pro</h2>
          <p className="mt-1 min-h-10 text-sm text-zinc-600">For tradespeople who bring their own clients and want to stand out when homeowners compare quotes.</p>
          <p className="mt-5 flex items-baseline gap-2">
            <span className="text-lg font-semibold text-zinc-400 line-through">{formatPence(PRO_LIST_PRICE_PENCE[interval])}</span>
            <span className="text-5xl font-bold tracking-tight">{formatPence(PRO_LAUNCH_PRICE_PENCE[interval])}</span>
            <span className="text-sm text-zinc-500">/{perYear ? "year" : "month"}</span>
          </p>
          <p className="mt-1"><span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">Launch price, locked in while you stay subscribed</span></p>
          <p className="mt-1 min-h-5 text-xs text-zinc-500">{proPerMonthText}</p>
          {viewer === "professional" ? (
            <form action={startCheckout} className="mt-5">
              <input type="hidden" name="interval" value={interval} />
              <button type="submit" className="w-full rounded-full bg-[#3a6694] px-4 py-3 text-sm font-bold text-white hover:bg-[#2c5075]">Get Pro</button>
            </form>
          ) : viewer === "pro" ? (
            <Link href="/professional/plan" className="mt-5 block rounded-full bg-[#3a6694] px-4 py-3 text-center text-sm font-bold text-white hover:bg-[#2c5075]">You&apos;re on Pro: manage plan</Link>
          ) : viewer === "guest" ? (
            <Link href="/signup?role=professional" className="mt-5 block rounded-full bg-[#3a6694] px-4 py-3 text-center text-sm font-bold text-white hover:bg-[#2c5075]">Create a free profile to get Pro</Link>
          ) : (
            <p className="mt-5 rounded-2xl bg-zinc-50 px-4 py-3 text-center text-xs text-zinc-600">Plans are for tradespeople. You&apos;re signed in as a homeowner, and GlowUpp is free for you.</p>
          )}
          <ul className="mt-6 flex flex-col gap-3 text-sm">
            <li className="text-xs font-bold uppercase tracking-wide text-[#3a6694]">Everything in Pay as you win, plus</li>
            <li className={`${tick} font-semibold`}>No fee on your own clients, however many jobs</li>
            <li className={tick}>A Pro badge on your quotes</li>
            <li className={tick}>Listed higher when a homeowner compares quotes</li>
          </ul>
          <p className="mt-5 rounded-2xl bg-blue-50 px-4 py-3 text-xs leading-relaxed text-[#132a4d]">{breakEvenText}</p>
        </section>

        {/* Max: not on sale yet */}
        <section className="flex flex-col rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-bold">Max <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-bold text-zinc-600">Coming soon</span></h2>
          <p className="mt-1 min-h-10 text-sm text-zinc-600">For busy firms that want the most: their area, their team and their brand.</p>
          <p className="mt-5 flex items-baseline gap-2">
            <span className="text-lg font-semibold text-zinc-400 line-through">{formatPence(MAX_LIST_PRICE_PENCE)}</span>
            <span className="text-5xl font-bold tracking-tight">{formatPence(MAX_LAUNCH_PRICE_PENCE)}</span>
            <span className="text-sm text-zinc-500">/month</span>
          </p>
          <p className="mt-1"><span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-bold text-zinc-600">Planned launch price</span></p>
          <p className="min-h-5 text-xs text-zinc-500">Not on sale yet</p>
          <span className="mt-5 block cursor-not-allowed rounded-full border-[1.5px] border-zinc-200 px-4 py-3 text-center text-sm font-bold text-zinc-400" aria-disabled="true">Not available yet</span>
          <ul className="mt-6 flex flex-col gap-3 text-sm text-zinc-700">
            <li className="text-xs font-bold uppercase tracking-wide text-zinc-500">Planned: everything in Pro, plus</li>
            <li className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:h-2.5 before:w-2.5 before:rounded-full before:bg-zinc-300">Limited slots per area, so fewer competitors on the same leads</li>
            <li className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:h-2.5 before:w-2.5 before:rounded-full before:bg-zinc-300">Priority alerts for new local projects</li>
            <li className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:h-2.5 before:w-2.5 before:rounded-full before:bg-zinc-300">Team seats for your staff</li>
            <li className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:h-2.5 before:w-2.5 before:rounded-full before:bg-zinc-300">Full stats on views and quotes</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
