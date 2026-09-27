"use client";

import { useActionState } from "react";
import { uploadProjectPhoto, type ActionState } from "@/lib/actions/photos";

export function PhotoUploadForm({ projectId }: { projectId: string }) {
  const boundAction = uploadProjectPhoto.bind(null, projectId);
  const [state, action, pending] = useActionState<ActionState, FormData>(boundAction, undefined);

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/heic" required className="text-sm text-zinc-600" />
      <select
        name="photoType"
        defaultValue="BEFORE"
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-[#132a4d] focus:border-[#3a6694] focus:outline-none"
      >
        <option value="BEFORE">Before</option>
        <option value="INSPIRATION">Inspiration</option>
        <option value="OTHER">Other</option>
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[#3a6694] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2c5075] disabled:opacity-50"
      >
        {pending ? "Uploading…" : "Upload"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
