"use client";

import { useActionState } from "react";
import { regenerateDesignConcept, type ActionState } from "@/lib/actions/designs";
import { REQUEST_NETWORK_ERROR, withNetworkGuard } from "@/lib/upload-guard";

/** For a style whose image failed to generate: tries that same style again. */
export function RetryDesignButton({ projectId, conceptId }: { projectId: string; conceptId: string }) {
  const boundAction = regenerateDesignConcept.bind(null, projectId, conceptId);
  const [state, action, pending] = useActionState<ActionState, FormData>(withNetworkGuard(boundAction, REQUEST_NETWORK_ERROR), undefined);

  return (
    <form action={action} className="flex flex-col gap-1">
      <button type="submit" disabled={pending} className="rounded-full border border-[#3a6694] px-4 py-2 text-sm font-medium text-[#3a6694] hover:bg-blue-50 disabled:opacity-50">
        {pending ? "Trying again…" : "Try this style again"}
      </button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
