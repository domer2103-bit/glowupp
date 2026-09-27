"use client";

import Link from "next/link";
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
  isGuest: boolean;
}

export function ConceptCard({ projectId, concept, url, isGuest }: ConceptCardProps) {
  const regenerateAction = regenerateDesignConcept.bind(null, projectId, concept.id);
  const [regenState, regenDispatch, regenPending] = useActionState<ActionState, FormData>(regenerateAction, undefined);

  const changesAction = requestDesignChanges.bind(null, projectId, concept.id);
  const [changesState, changesDispatch, changesPending] = useActionState<ActionState, FormData>(changesAction, undefined);

  const isComplete = concept.status === "COMPLETE";

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-3 transition ${
        concept.selectedByUser ? "border-[#3a6694] ring-2 ring-[#3a6694]/30" : "border-zinc-200"
      }`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={concept.description ?? `Design v${concept.version}`} className="aspect-video rounded-xl object-cover" />
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-zinc-300 text-xs text-zinc-500">
          {concept.status === "FAILED" ? "Generation failed" : "Generating…"}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          v{concept.version} — {concept.description ?? concept.model}
        </span>
        {concept.selectedByUser ? (
          <span className="font-medium text-[#3a6694]">★ Preferred</span>
        ) : (
          <span>{concept.status}</span>
        )}
      </div>

      {isComplete && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-3">
            {!concept.selectedByUser && (
              <form action={selectDesignConcept.bind(null, projectId, concept.id)}>
                <button type="submit" className="text-xs font-medium text-[#3a6694] underline">
                  Select as preferred
                </button>
              </form>
            )}
            <form action={regenDispatch}>
              <button type="submit" disabled={regenPending} className="text-xs font-medium text-[#3a6694] underline disabled:opacity-50">
                {regenPending ? "Regenerating…" : "Regenerate"}
              </button>
            </form>
            {isGuest ? (
              <Link
                href={`/signup?next=${encodeURIComponent(`/projects/${projectId}`)}`}
                className="text-xs font-medium text-[#3a6694] underline"
              >
                Sign in to download
              </Link>
            ) : (
              url && (
                <a href={url} download className="text-xs font-medium text-[#3a6694] underline">
                  Download
                </a>
              )
            )}
          </div>
          {regenState?.error && <p className="text-xs text-red-600">{regenState.error}</p>}

          <form action={changesDispatch} className="flex flex-col gap-2">
            <input
              name="changeRequest"
              placeholder="Request a change (e.g. darker worktop)…"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-[#132a4d] placeholder:text-zinc-400 focus:border-[#3a6694] focus:outline-none"
            />
            <button
              type="submit"
              disabled={changesPending}
              className="self-start text-xs font-medium text-[#3a6694] underline disabled:opacity-50"
            >
              {changesPending ? "Applying…" : "Apply change"}
            </button>
            {changesState?.error && <p className="text-xs text-red-600">{changesState.error}</p>}
          </form>
        </div>
      )}
    </div>
  );
}
