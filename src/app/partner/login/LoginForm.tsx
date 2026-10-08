"use client";

import { useActionState } from "react";
import { requestPartnerLoginLink, type PartnerActionState } from "@/lib/actions/partner";

export function LoginForm() {
  const [state, dispatch, pending] = useActionState<PartnerActionState, FormData>(requestPartnerLoginLink, undefined);
  return (
    <form action={dispatch} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Email you signed up with
        <input
          name="email"
          type="email"
          required
          maxLength={120}
          autoComplete="email"
          inputMode="email"
          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-[#132a4d] focus:border-[#3a6694] focus:outline-none focus:ring-2 focus:ring-[#3a6694]/25"
        />
      </label>
      <button type="submit" disabled={pending} className="rounded-full bg-[#3a6694] px-6 py-3.5 text-base font-semibold text-white transition hover:bg-[#2c5075] disabled:opacity-60">
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
      {state?.info && (
        <p role="status" className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-[#132a4d]">
          {state.info}
        </p>
      )}
      {state?.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
