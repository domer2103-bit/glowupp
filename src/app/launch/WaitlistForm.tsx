"use client";

import { useActionState } from "react";
import { joinWaitlist, type ActionState } from "@/lib/actions/waitlist";

export function WaitlistForm({ source }: { source?: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(joinWaitlist, undefined);

  if (state?.success) {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-2 rounded-2xl border border-[#3a6694] bg-blue-50 px-6 py-8 text-center">
        <span className="text-2xl">✓</span>
        <p className="font-semibold text-[#132a4d]">You&apos;re on the list!</p>
        <p className="text-sm text-zinc-600">We&apos;ll email you the moment GlowUpp launches.</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-3 sm:flex-row">
      {source && <input type="hidden" name="source" value={source} />}
      <input
        name="email"
        type="email"
        placeholder="you@example.com"
        required
        className="w-full rounded-full border border-zinc-300 px-5 py-3 text-sm text-[#132a4d] outline-none focus:border-[#3a6694] sm:flex-1"
      />
      <button
        type="submit"
        disabled={pending}
        className="w-full shrink-0 rounded-full bg-[#3a6694] px-6 py-3 text-sm font-medium text-white hover:bg-[#2c5075] disabled:opacity-50 sm:w-auto"
      >
        {pending ? "Joining…" : "Join the Waitlist"}
      </button>
      {state?.error && <p className="w-full text-center text-sm text-red-600 sm:text-left">{state.error}</p>}
    </form>
  );
}
