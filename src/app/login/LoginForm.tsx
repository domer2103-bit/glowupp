"use client";

import { useActionState } from "react";
import { login, type ActionState } from "@/lib/actions/auth";

export function LoginForm({ projectType }: { projectType?: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(login, undefined);

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      {projectType && <input type="hidden" name="projectType" value={projectType} />}
      <input name="email" type="email" placeholder="Email" required className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
      <input name="password" type="password" placeholder="Password" required className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-black px-5 py-3 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
