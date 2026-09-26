"use client";

import { useActionState } from "react";
import { submitVerificationDocument, type ActionState } from "@/lib/actions/verification";

export function VerificationForm() {
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(submitVerificationDocument, undefined);

  return (
    <form action={dispatch} className="flex flex-col gap-3 rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
      <input
        name="document"
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        required
        className="text-sm"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Uploading…" : "Upload certificate"}
      </button>
    </form>
  );
}
