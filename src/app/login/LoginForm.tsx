"use client";

import { useActionState } from "react";
import { login, type ActionState } from "@/lib/actions/auth";

export function LoginForm({ projectType, next }: { projectType?: string; next?: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(login, undefined);

  return (
    <form action={action} className="flex w-full flex-col gap-4">
      {projectType && <input type="hidden" name="projectType" value={projectType} />}
      {next && <input type="hidden" name="next" value={next} />}
      <input
        name="email"
        type="email"
        placeholder="Email"
        required
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-[#132a4d] outline-none focus:border-[#3a6694]"
      />
      <input
        name="password"
        type="password"
        placeholder="Password"
        required
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-[#132a4d] outline-none focus:border-[#3a6694]"
      />

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[#3a6694] px-5 py-3 text-sm font-medium text-white hover:bg-[#2c5075] disabled:opacity-50"
      >
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
