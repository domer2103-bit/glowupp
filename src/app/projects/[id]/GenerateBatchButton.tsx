"use client";

import { useActionState } from "react";
import { generateDesignBatch, type ActionState } from "@/lib/actions/designs";

export function GenerateBatchButton({ projectId, photoId }: { projectId: string; photoId: string }) {
  const boundAction = generateDesignBatch.bind(null, projectId, photoId);
  const [state, action, pending] = useActionState<ActionState, FormData>(boundAction, undefined);

  return (
    <form action={action}>
      <button type="submit" disabled={pending} className="text-xs font-medium text-[#3a6694] underline disabled:opacity-50">
        {pending ? "Starting…" : "Generate design concepts"}
      </button>
      {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
