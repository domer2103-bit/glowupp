"use client";

import { useActionState } from "react";
import { createProject, type ActionState } from "@/lib/actions/projects";
import { PROJECT_TYPES } from "@/lib/project-types";

export function NewProjectForm({ initialType }: { initialType?: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createProject, undefined);
  const isValidInitialType = initialType && PROJECT_TYPES.some((t) => t.key === initialType);

  return (
    <form action={action} className="flex w-full max-w-md flex-col gap-4">
      <select name="projectType" required defaultValue={isValidInitialType ? initialType : ""} className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
        <option value="" disabled>
          What are you transforming?
        </option>
        {PROJECT_TYPES.map((t) => (
          <option key={t.key} value={t.key}>
            {t.label}
          </option>
        ))}
      </select>

      <input name="title" placeholder="Project title (e.g. Redo the kitchen)" required className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
      <textarea name="description" placeholder="Tell us a bit about what you have in mind (optional)" className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
      <input name="postcode" placeholder="Postcode" required className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />

      <div className="flex gap-3">
        <input name="budgetMin" type="number" min="0" placeholder="Min budget (£)" className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
        <input name="budgetMax" type="number" min="0" placeholder="Max budget (£)" className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
      </div>

      <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
        Target start date (optional)
        <input name="targetStartDate" type="date" className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className="rounded-full bg-black px-5 py-3 text-white disabled:opacity-50 dark:bg-white dark:text-black">
        {pending ? "Creating…" : "Create project"}
      </button>
    </form>
  );
}
