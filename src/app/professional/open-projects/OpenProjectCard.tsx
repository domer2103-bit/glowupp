"use client";

import { useActionState } from "react";
import { submitOpenMarketQuote, type ActionState } from "@/lib/actions/quotes";
import { penceToPounds } from "@/lib/money";

interface OpenProjectCardProps {
  project: {
    id: string;
    title: string;
    projectType: string;
    postcode: string;
    description: string | null;
    budgetMin: number | null;
    budgetMax: number | null;
  };
}

export function OpenProjectCard({ project }: OpenProjectCardProps) {
  const quoteAction = submitOpenMarketQuote.bind(null, project.id);
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(quoteAction, undefined);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-300 px-4 py-3 dark:border-zinc-700">
      <span className="font-medium">{project.title}</span>
      <p className="text-sm text-zinc-500">
        {project.projectType} — {project.postcode}
        {project.budgetMin || project.budgetMax
          ? ` — £${project.budgetMin ? penceToPounds(project.budgetMin) : "?"}–£${project.budgetMax ? penceToPounds(project.budgetMax) : "?"}`
          : ""}
      </p>
      {project.description && <p className="text-sm text-zinc-600 dark:text-zinc-400">{project.description}</p>}

      <form action={dispatch} className="flex flex-col gap-2 rounded border border-zinc-200 p-3 dark:border-zinc-800">
        <span className="text-xs font-medium">Submit a quote</span>
        <input name="quoteAmount" type="number" min="0" placeholder="Amount (£)" required className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        <input name="quoteTimeline" placeholder="Estimated timeline (e.g. 3-4 weeks)" required className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        <textarea name="quoteNotes" placeholder="Notes (optional)" className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
        <button type="submit" disabled={pending} className="self-start rounded-full bg-black px-3 py-1 text-xs text-white disabled:opacity-50 dark:bg-white dark:text-black">
          {pending ? "Submitting…" : "Submit quote"}
        </button>
      </form>
    </div>
  );
}
