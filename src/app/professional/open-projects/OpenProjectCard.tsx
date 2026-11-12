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
    targetStartDate?: Date | null;
    brief?: { label: string; value: string; forQuote: boolean }[];
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
      {project.targetStartDate && (
        <p className="text-sm text-zinc-500">Wants to start around {project.targetStartDate.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</p>
      )}
      {project.brief && project.brief.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
          <p className="text-xs font-medium text-zinc-700">What the homeowner has told us</p>
          <ul className="mt-1 flex flex-col gap-0.5 text-xs text-zinc-600">
            {project.brief.map((line) => (
              <li key={line.label} className={line.forQuote ? "font-medium text-[#132a4d]" : undefined}>
                {line.label}: {line.value}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-zinc-500">Measurements and condition are the homeowner&apos;s own estimates, so check them on site.</p>
        </div>
      )}
      <p className="text-xs text-zinc-500">
        The AI picture is an illustration, not a survey or a binding price. Confirm measurements, condition and what is possible on site before you commit.
      </p>

      <form action={dispatch} className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-blue-50 p-3">
        <span className="text-xs font-medium">Send an estimate</span>
        <input
          name="quoteAmount"
          type="number"
          min="0"
          placeholder="Estimate amount (£)"
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
        <label className="flex items-start gap-2 text-xs text-zinc-700">
          <input type="checkbox" name="subjectToSurvey" defaultChecked className="mt-0.5" />
          <span>This is an estimate. The final price is confirmed after a site survey. (Untick only if you are giving a firm fixed quote.)</span>
        </label>
        {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-full bg-[#3a6694] px-3 py-1 text-xs font-medium text-white hover:bg-[#2c5075] disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send estimate"}
        </button>
      </form>
    </div>
  );
}
