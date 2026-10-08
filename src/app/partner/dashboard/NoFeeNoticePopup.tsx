"use client";

import { useEffect, useState } from "react";

/**
 * Pop-up shown on the partner dashboard when a job from their link carried no
 * fee (a free introductory job), so they know why it earned nothing. It is a
 * server-rendered form: "Got it" posts to the server action that records they
 * have read it, so it also works without JavaScript; Escape closes it locally
 * and records the same thing.
 */
export function NoFeeNoticePopup({ title, messages, dismiss }: { title: string; messages: string[]; dismiss: () => Promise<void> }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      void dismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dismiss]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="no-fee-title" className="w-full max-w-md rounded-3xl bg-white p-6 text-[#132a4d] shadow-2xl">
        <h2 id="no-fee-title" className="text-lg font-semibold">
          {title}
        </h2>
        <ul className="mt-3 flex flex-col gap-3 text-sm text-zinc-700">
          {messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <form action={dismiss} onSubmit={() => setOpen(false)} className="mt-5">
          <button type="submit" autoFocus className="w-full rounded-full bg-[#3a6694] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#2c5075]">
            Got it
          </button>
        </form>
      </div>
    </div>
  );
}
