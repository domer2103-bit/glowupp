"use client";

import { useActionState } from "react";
import { createAffiliate, type AffiliateActionState } from "@/lib/actions/affiliates";
import { AFFILIATE_CATEGORIES, AFFILIATE_CATEGORY_LABELS } from "@/lib/affiliate";

const INPUT = "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-[#132a4d]";

export function NewAffiliateForm() {
  const [state, dispatch, pending] = useActionState<AffiliateActionState, FormData>(createAffiliate, undefined);

  return (
    <form action={dispatch} className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Business name</span>
        <input name="businessName" required maxLength={80} className={INPUT} placeholder="The Daily Grind" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Contact person</span>
        <input name="contactName" required maxLength={80} className={INPUT} placeholder="Sam Taylor" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Email</span>
        <input name="email" type="email" required maxLength={120} className={INPUT} placeholder="sam@thedailygrind.co.uk" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">
          Phone <span className="font-normal text-zinc-500">(optional)</span>
        </span>
        <input name="phone" type="tel" maxLength={30} className={INPUT} />
      </label>
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        <span className="font-medium">Category</span>
        <select name="category" required defaultValue="" className={INPUT}>
          <option value="" disabled>
            Choose…
          </option>
          {AFFILIATE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {AFFILIATE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={pending} className="rounded-full bg-[#3a6694] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#2c5075] disabled:opacity-50">
          {pending ? "Creating…" : "Create partner"}
        </button>
        <span className="text-xs text-zinc-500">Starts at the default 50% share of the fee GlowUpp collects. You&apos;ll get their link, QR and printable assets next.</span>
      </div>
      {state?.error && (
        <p className="text-sm text-red-600 sm:col-span-2" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
