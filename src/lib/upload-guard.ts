/**
 * Wraps an upload Server Action so a dropped connection becomes a normal
 * "try again" message instead of an error screen. A server action that never
 * reaches the server (a weak signal, a request cut off midway) throws in the
 * browser, and React shows that as a crash; here it becomes `{ error }`.
 * Next's own control-flow errors (redirect, not-found), which carry a
 * `digest` starting with "NEXT_", are passed through untouched.
 */
export const UPLOAD_NETWORK_ERROR = "Upload didn't go through — your connection may have dropped. Please try again.";

export function withNetworkGuard<S extends { error?: string } | undefined>(action: (prev: S, formData: FormData) => Promise<S>): (prev: S, formData: FormData) => Promise<S> {
  return async (prev, formData) => {
    try {
      return await action(prev, formData);
    } catch (err) {
      const digest = typeof err === "object" && err !== null ? (err as { digest?: unknown }).digest : undefined;
      if (typeof digest === "string" && digest.startsWith("NEXT_")) throw err;
      return { error: UPLOAD_NETWORK_ERROR } as S;
    }
  };
}
