"use client";

import { useActionState } from "react";
import { pushToOpenMarket, type ActionState } from "@/lib/actions/quotes";

export function PushToMarketButton({ projectId }: { projectId: string }) {
  const boundAction = pushToOpenMarket.bind(null, projectId);
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(boundAction, undefined);

  return (
    <form action={dispatch} className="flex flex-col items-start gap-1">
      <button
        type="submit"
        disabled={pending}
        className="inline-block rounded-full bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Pushing…" : "Push to open market"}
      </button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
