"use client";

import { useCallback, useState, useTransition, type FormEvent } from "react";
import { shrinkFormDataFiles } from "@/lib/image-shrink";

/**
 * Submit handler for an upload form: collects the form's data, shrinks the
 * photos in the named file fields (see src/lib/image-shrink.ts), then hands
 * the result to the form's Server Action. `preparing` is true while photos
 * are being shrunk (before the upload itself starts), for a status label.
 *
 * Use as `<form onSubmit={onSubmit}>` in place of `<form action={action}>`.
 * `clearFiles` empties the file inputs afterwards (for forms that are only an upload); leave it off when the form has other fields to resubmit after an error.
 * The dispatch runs inside a transition because it happens after an await.
 */
export function useShrunkUpload(dispatch: (formData: FormData) => void, fileFields: string[], options: { clearFiles?: boolean } = {}) {
  const [preparing, setPreparing] = useState(false);
  const [, startTransition] = useTransition();
  const key = fileFields.join("|");
  const clearFiles = options.clearFiles ?? false;

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const formData = new FormData(form);
      setPreparing(true);
      try {
        await shrinkFormDataFiles(formData, key.split("|"));
      } finally {
        setPreparing(false);
      }
      startTransition(() => dispatch(formData));
      if (clearFiles) {
        // The chosen file has been handed over; clear the input so the same photo can be picked again and a retry starts clean.
        form.querySelectorAll<HTMLInputElement>('input[type="file"]').forEach((input) => {
          input.value = "";
        });
      }
    },
    [dispatch, key, clearFiles]
  );

  return { onSubmit, preparing };
}
