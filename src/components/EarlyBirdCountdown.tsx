"use client";

import { useSyncExternalStore } from "react";
import { EARLY_BIRD_CUTOFF, EARLY_BIRD_FREE_JOBS } from "@/lib/fees";
import { timeLeft } from "@/lib/countdown";

/** Ticks once a second on the client; null on the server so the first render matches the HTML and never flashes a stale time. */
function subscribe(onTick: () => void) {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}
const getNow = () => Math.floor(Date.now() / 1000) * 1000;
const getServerNow = () => null;

/**
 * "Sign up before Black Friday" early-bird banner with a live countdown to
 * Fri 27 Nov 2026, 00:00 UK (src/lib/fees.ts::EARLY_BIRD_CUTOFF — the same
 * instant the commission waiver itself uses). Renders nothing once the offer
 * has ended, so it never needs removing by hand.
 */
export function EarlyBirdCountdown({ className = "" }: { className?: string }) {
  const now = useSyncExternalStore(subscribe, getNow, getServerNow);
  const left = now === null ? null : timeLeft(now, EARLY_BIRD_CUTOFF.getTime());
  if (left?.expired) return null;

  const units: [string, number | null][] = [
    ["days", left?.days ?? null],
    ["hours", left?.hours ?? null],
    ["mins", left?.minutes ?? null],
    ["secs", left?.seconds ?? null],
  ];

  return (
    <div className={`w-full rounded-2xl border border-[#3a6694]/25 bg-white/80 p-4 text-center shadow-sm ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#3a6694]">Early-bird offer</p>
      <p className="mt-1 text-sm font-medium text-[#132a4d]">
        {`Sign up before Black Friday and your first ${EARLY_BIRD_FREE_JOBS} jobs have no commission.`}
      </p>
      <div className="mt-3 flex justify-center gap-2" role="timer" aria-label="Time left to sign up for the early-bird offer">
        {units.map(([label, value]) => (
          <div key={label} className="min-w-14 rounded-xl bg-[#132a4d] px-2 py-2 text-white">
            <p className="text-xl font-semibold tabular-nums leading-none">{value === null ? "--" : String(value).padStart(2, "0")}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-blue-200">{label}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-zinc-500">Offer ends at the end of Thursday 26 November 2026, the day before Black Friday.</p>
    </div>
  );
}
