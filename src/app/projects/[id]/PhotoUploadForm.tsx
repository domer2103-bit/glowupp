"use client";

import { useActionState } from "react";
import { uploadProjectPhoto, type ActionState } from "@/lib/actions/photos";
import { useShrunkUpload } from "@/components/useShrunkUpload";
import { withNetworkGuard } from "@/lib/upload-guard";

/** "Add another angle": one button that uploads as soon as a photo is picked. */
export function PhotoUploadForm({ projectId }: { projectId: string }) {
  const boundAction = uploadProjectPhoto.bind(null, projectId);
  const [state, action, pending] = useActionState<ActionState, FormData>(withNetworkGuard(boundAction), undefined);
  const { onSubmit, preparing } = useShrunkUpload(action, ["file"], { clearFiles: true });

  return (
    <form onSubmit={onSubmit} className="flex flex-col items-start gap-2">
      <input type="hidden" name="photoType" value="BEFORE" />
      <label className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border border-[#3a6694] px-6 py-3 text-sm font-semibold text-[#3a6694] transition hover:bg-blue-50">
        {preparing ? "Preparing…" : pending ? "Uploading…" : "↑ Add a photo"}
        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          disabled={pending || preparing}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        />
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
