"use client";

import { useActionState } from "react";
import { createProfessionalProfile, type ActionState } from "@/lib/actions/auth";
import { PROJECT_TYPES } from "@/lib/project-types";

export function OnboardingForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createProfessionalProfile, undefined);

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <input name="businessName" placeholder="Business name" required className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
      <input name="postcode" placeholder="Postcode" required className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
      <textarea name="description" placeholder="Describe your business (optional)" className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Services you offer</legend>
        {PROJECT_TYPES.map((t) => (
          <label key={t.key} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="services" value={t.key} />
            {t.label}
          </label>
        ))}
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">
          Postcode areas/districts you serve — comma-separated, e.g. &quot;L1, L18&quot; for specific districts or just &quot;L&quot; for the whole Liverpool area
        </span>
        <input
          name="serviceAreaPrefixes"
          placeholder="e.g. L1, L18 or L"
          required
          className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-black px-5 py-3 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Saving…" : "Complete profile"}
      </button>
    </form>
  );
}
