"use client";

import { useActionState } from "react";
import { uploadPortfolioPhoto, type ActionState } from "@/lib/actions/portfolio";

export function PortfolioUploadForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(uploadPortfolioPhoto, undefined);

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/heic" required />
      <button type="submit" disabled={pending} className="rounded-full border border-black px-4 py-2 text-sm disabled:opacity-50 dark:border-white">
        {pending ? "Uploading…" : "Upload"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
