"use client";

import { useActionState } from "react";
import { requestPrivateEstimate } from "@/lib/actions/private-pipeline";
import type { ActionState } from "@/lib/actions/quotes";

export function SendPrivateEstimateButton({ projectId, contractorName }: { projectId: string; contractorName: string }) {
  const boundAction = requestPrivateEstimate.bind(null, projectId);
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(boundAction, undefined);

  return (
    <form action={dispatch} className="flex flex-col items-start gap-1">
      <button
        type="submit"
        disabled={pending}
        className="inline-block rounded-full bg-[#3a6694] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2c5075] disabled:opacity-50"
      >
        {pending ? "Sending…" : `Send render & request official estimate from ${contractorName}`}
      </button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
