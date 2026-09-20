"use client";

import { useActionState } from "react";
import {
  regenerateDesignConcept,
  requestDesignChanges,
  selectDesignConcept,
  type ActionState,
} from "@/lib/actions/designs";

interface ConceptCardProps {
  projectId: string;
  concept: {
    id: string;
    version: number;
    status: string;
    model: string;
    description: string | null;
    selectedByUser: boolean;
  };
  url: string | null;
}

export function ConceptCard({ projectId, concept, url }: ConceptCardProps) {
  const regenerateAction = regenerateDesignConcept.bind(null, projectId, concept.id);
  const [regenState, regenDispatch, regenPending] = useActionState<ActionState, FormData>(regenerateAction, undefined);

  const changesAction = requestDesignChanges.bind(null, projectId, concept.id);
  const [changesState, changesDispatch, changesPending] = useActionState<ActionState, FormData>(changesAction, undefined);

  const isComplete = concept.status === "COMPLETE";

  return (
    <div className={`flex flex-col gap-2 rounded-lg border p-2 ${concept.selectedByUser ? "border-black dark:border-white" : "border-zinc-300 dark:border-zinc-700"}`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={concept.description ?? `Design v${concept.version}`} className="aspect-video rounded object-cover" />
      ) : (
        <div className="flex aspect-video items-center justify-center rounded border border-dashed border-zinc-400 text-xs text-zinc-500">
          {concept.status === "FAILED" ? "Generation failed" : "Generating…"}
        </div>
      )}

      <div className="text-xs text-zinc-500">
        v{concept.version} — {concept.description ?? concept.model} — {concept.status}
        {concept.selectedByUser && <span className="ml-1 font-medium text-black dark:text-white">★ Preferred</span>}
      </div>

      {isComplete && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            {!concept.selectedByUser && (
              <form action={selectDesignConcept.bind(null, projectId, concept.id)}>
                <button type="submit" className="text-xs underline">
                  Select as preferred
                </button>
              </form>
            )}
            <form action={regenDispatch}>
              <button type="submit" disabled={regenPending} className="text-xs underline disabled:opacity-50">
                {regenPending ? "Regenerating…" : "Regenerate"}
              </button>
            </form>
          </div>
          {regenState?.error && <p className="text-xs text-red-600">{regenState.error}</p>}

          <form action={changesDispatch} className="flex flex-col gap-1">
            <input
              name="changeRequest"
              placeholder="Request a change (e.g. darker worktop)…"
              className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button type="submit" disabled={changesPending} className="self-start text-xs underline disabled:opacity-50">
              {changesPending ? "Applying…" : "Apply change"}
            </button>
            {changesState?.error && <p className="text-xs text-red-600">{changesState.error}</p>}
          </form>
        </div>
      )}
    </div>
  );
}
