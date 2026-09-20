"use client";

import { useActionState } from "react";
import { requestQuotes, type ActionState } from "@/lib/actions/quotes";

export function RequestQuotesForm({ projectId, professionals }: { projectId: string; professionals: { id: string; businessName: string }[] }) {
  const boundAction = requestQuotes.bind(null, projectId);
  const [state, action, pending] = useActionState<ActionState, FormData>(boundAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
      <h2 className="font-medium">Get quotes from your picks</h2>
      <fieldset className="flex flex-col gap-2">
        {professionals.map((p) => (
          <label key={p.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="professionalIds" value={p.id} defaultChecked />
            {p.businessName}
          </label>
        ))}
      </fieldset>
      <textarea
        name="message"
        placeholder="A note to include with your request (optional)"
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="self-start rounded-full bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black">
        {pending ? "Sending…" : "Request quotes"}
      </button>
    </form>
  );
}
