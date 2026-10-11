"use client";

import { useActionState, useState } from "react";
import { pushToOpenMarket, type ActionState } from "@/lib/actions/quotes";
import { REQUEST_NETWORK_ERROR, withNetworkGuard } from "@/lib/upload-guard";

/**
 * Tradespeople are matched on the project's postcode, so it is needed — but only once the homeowner
 * has said they want quotes. The first tap on the button reveals the postcode box; if the project
 * already has one, the button sends straight away.
 */
export function PushToMarketButton({ projectId, postcode }: { projectId: string; postcode: string }) {
  const boundAction = pushToOpenMarket.bind(null, projectId);
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(withNetworkGuard(boundAction, REQUEST_NETWORK_ERROR), undefined);
  const [askingPostcode, setAskingPostcode] = useState(false);
  const needsPostcode = !postcode;

  return (
    <form action={dispatch} className="flex flex-col items-start gap-3">
      {askingPostcode && (
        <label className="flex flex-col gap-1 text-sm font-medium text-[#132a4d]">
          What&apos;s your postcode?
          <input
            name="postcode"
            defaultValue={postcode}
            required
            autoFocus
            autoComplete="postal-code"
            placeholder="e.g. L18 5NF"
            className="w-44 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-normal uppercase text-[#132a4d] outline-none focus:border-[#3a6694]"
          />
          <span className="text-xs font-normal text-zinc-500">So we can find tradespeople near you.</span>
        </label>
      )}
      {needsPostcode && !askingPostcode ? (
        <button
          type="button"
          onClick={() => setAskingPostcode(true)}
          className="inline-flex min-h-12 items-center rounded-full bg-[#3a6694] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2c5075]"
        >
          Find a tradesperson to quote
        </button>
      ) : (
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 items-center rounded-full bg-[#3a6694] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2c5075] disabled:opacity-50"
        >
          {pending ? "Sending…" : askingPostcode ? "Send my project to tradespeople" : "Find a tradesperson to quote"}
        </button>
      )}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
