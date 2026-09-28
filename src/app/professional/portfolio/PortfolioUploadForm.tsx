"use client";

import { useActionState } from "react";
import { uploadPortfolioPhoto, type ActionState } from "@/lib/actions/portfolio";

export function PortfolioUploadForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(uploadPortfolioPhoto, undefined);

  return (
    <form action={action} className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/heic" required className="text-sm text-[#132a4d]" />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-[#3a6694] px-4 py-2 text-sm font-medium text-[#3a6694] hover:bg-blue-50 disabled:opacity-50"
      >
        {pending ? "Uploading…" : "Upload"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
