"use client";

import { useActionState } from "react";
import { uploadProjectPhoto, type ActionState } from "@/lib/actions/photos";

export function PhotoUploadForm({ projectId }: { projectId: string }) {
  const boundAction = uploadProjectPhoto.bind(null, projectId);
  const [state, action, pending] = useActionState<ActionState, FormData>(boundAction, undefined);

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/heic" required />
      <select name="photoType" defaultValue="BEFORE" className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900">
        <option value="BEFORE">Before</option>
        <option value="INSPIRATION">Inspiration</option>
        <option value="OTHER">Other</option>
      </select>
      <button type="submit" disabled={pending} className="rounded-full border border-black px-4 py-2 text-sm disabled:opacity-50 dark:border-white">
        {pending ? "Uploading…" : "Upload"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
