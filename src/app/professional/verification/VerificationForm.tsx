"use client";

import { useActionState } from "react";
import { submitVerificationDocument, type ActionState } from "@/lib/actions/verification";

export function VerificationForm() {
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(submitVerificationDocument, undefined);

  return (
    <form action={dispatch} className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <input name="document" type="file" accept="application/pdf,image/jpeg,image/png" required className="text-sm text-[#132a4d]" />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-[#3a6694] px-4 py-2 text-sm font-medium text-white hover:bg-[#2c5075] disabled:opacity-50"
      >
        {pending ? "Uploading…" : "Upload certificate"}
      </button>
    </form>
  );
}
