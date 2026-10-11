"use client";

import { useActionState } from "react";
import { generateMoreStyles, type ActionState } from "@/lib/actions/designs";
import { REQUEST_NETWORK_ERROR, withNetworkGuard } from "@/lib/upload-guard";

export function MoreStylesButton({ projectId }: { projectId: string }) {
  const boundAction = generateMoreStyles.bind(null, projectId);
  const [state, action, pending] = useActionState<ActionState, FormData>(withNetworkGuard(boundAction, REQUEST_NETWORK_ERROR), undefined);

  return (
    <form action={action} className="flex flex-col items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 items-center rounded-full border border-[#3a6694] px-6 py-3 text-sm font-semibold text-[#3a6694] transition hover:bg-blue-50 disabled:opacity-50"
      >
        {pending ? "Starting…" : "Show me different styles"}
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
