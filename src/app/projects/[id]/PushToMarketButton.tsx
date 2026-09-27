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
        className="inline-block rounded-full bg-[#3a6694] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2c5075] disabled:opacity-50"
      >
        {pending ? "Pushing…" : "Push to open market"}
      </button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
