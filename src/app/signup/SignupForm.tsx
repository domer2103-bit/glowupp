"use client";

import { useActionState, useState } from "react";
import { signup, type ActionState } from "@/lib/actions/auth";

export function SignupForm({
  projectType,
  next,
  defaultRole = "HOMEOWNER",
}: {
  projectType?: string;
  next?: string;
  defaultRole?: "HOMEOWNER" | "PROFESSIONAL";
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(signup, undefined);
  const [role, setRole] = useState<"HOMEOWNER" | "PROFESSIONAL">(defaultRole);

  return (
    <form action={action} className="flex w-full flex-col gap-4">
      {projectType && <input type="hidden" name="projectType" value={projectType} />}
      {next && <input type="hidden" name="next" value={next} />}
      <div className="flex rounded-full border border-zinc-300 p-0.5 text-sm">
        {(["HOMEOWNER", "PROFESSIONAL"] as const).map((r) => (
          <label
            key={r}
            className={`flex-1 cursor-pointer rounded-full px-3 py-2 text-center transition ${
              role === r ? "bg-[#3a6694] text-white" : "text-zinc-600 hover:text-[#132a4d]"
            }`}
          >
            <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="sr-only" />
            {r === "HOMEOWNER" ? "I'm a homeowner" : "I'm a professional"}
          </label>
        ))}
      </div>

      <input
        name="name"
        placeholder="Full name"
        required
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-[#132a4d] outline-none focus:border-[#3a6694]"
      />
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
        placeholder="Password (min 8 characters)"
        required
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-[#132a4d] outline-none focus:border-[#3a6694]"
      />
      <input
        name="postcode"
        placeholder="Postcode"
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-[#132a4d] outline-none focus:border-[#3a6694]"
      />

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.info && <p className="text-sm text-emerald-700">{state.info}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[#3a6694] px-5 py-3 text-sm font-medium text-white hover:bg-[#2c5075] disabled:opacity-50"
      >
        {pending ? "Creating account…" : "Sign up"}
      </button>
    </form>
  );
}
