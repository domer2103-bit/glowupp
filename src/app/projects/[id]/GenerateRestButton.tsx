"use client";

import { useActionState } from "react";
import { generateRemainingPhotos, type ActionState } from "@/lib/actions/designs";

export function GenerateRestButton({ projectId, count }: { projectId: string; count: number }) {
  const boundAction = generateRemainingPhotos.bind(null, projectId);
  const [state, action, pending] = useActionState<ActionState, FormData>(boundAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-2 rounded-2xl border border-[#3a6694]/30 bg-blue-50/60 p-4">
      <p className="text-sm text-zinc-600">
        You uploaded {count} more photo{count === 1 ? "" : "s"} of this space. We&apos;ll design {count === 1 ? "it" : "them"} in
        the style you chose — same colours and materials, from {count === 1 ? "its" : "their"} own angle.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-[#3a6694] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2c5075] disabled:opacity-60"
      >
        {pending ? "Starting…" : `Design my other ${count === 1 ? "photo" : `${count} photos`} in this style`}
      </button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
