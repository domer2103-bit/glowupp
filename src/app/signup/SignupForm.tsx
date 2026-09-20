"use client";

import { useActionState, useState } from "react";
import { signup, type ActionState } from "@/lib/actions/auth";

export function SignupForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(signup, undefined);
  const [role, setRole] = useState<"HOMEOWNER" | "PROFESSIONAL">("HOMEOWNER");

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex gap-2">
        {(["HOMEOWNER", "PROFESSIONAL"] as const).map((r) => (
          <label
            key={r}
            className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm ${
              role === r ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-zinc-300 dark:border-zinc-700"
            }`}
          >
            <input
              type="radio"
              name="role"
              value={r}
              checked={role === r}
              onChange={() => setRole(r)}
              className="sr-only"
            />
            {r === "HOMEOWNER" ? "I'm a homeowner" : "I'm a professional"}
          </label>
        ))}
      </div>

      <input name="name" placeholder="Full name" required className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
      <input name="email" type="email" placeholder="Email" required className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
      <input name="password" type="password" placeholder="Password (min 8 characters)" required className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
      <input name="postcode" placeholder="Postcode" className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.info && <p className="text-sm text-green-700 dark:text-green-400">{state.info}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-black px-5 py-3 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Creating account…" : "Sign up"}
      </button>
    </form>
  );
}
