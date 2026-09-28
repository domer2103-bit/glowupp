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
    <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
      <span className="font-medium">{project.title}</span>
      <p className="text-sm text-zinc-500">
        {project.projectType} — {project.postcode}
        {project.budgetMin || project.budgetMax
          ? ` — £${project.budgetMin ? penceToPounds(project.budgetMin) : "?"}–£${project.budgetMax ? penceToPounds(project.budgetMax) : "?"}`
          : ""}
      </p>
      {project.description && <p className="text-sm text-zinc-600">{project.description}</p>}

      <form action={dispatch} className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-blue-50 p-3">
        <span className="text-xs font-medium">Submit a quote</span>
        <input
          name="quoteAmount"
          type="number"
          min="0"
          placeholder="Amount (£)"
          required
          className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-[#132a4d] outline-none focus:border-[#3a6694]"
        />
        <input
          name="quoteTimeline"
          placeholder="Estimated timeline (e.g. 3-4 weeks)"
          required
          className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-[#132a4d] outline-none focus:border-[#3a6694]"
        />
        <textarea
          name="quoteNotes"
          placeholder="Notes (optional)"
          className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-[#132a4d] outline-none focus:border-[#3a6694]"
        />
        {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-full bg-[#3a6694] px-3 py-1 text-xs font-medium text-white hover:bg-[#2c5075] disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Submit quote"}
        </button>
      </form>
    </div>
  );
}
