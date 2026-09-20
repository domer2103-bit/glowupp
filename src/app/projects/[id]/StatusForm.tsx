"use client";

import { useActionState } from "react";
import { updateProjectStatus, type ActionState } from "@/lib/actions/projects";

// Mirrors MANUALLY_SETTABLE_STATUSES in src/lib/actions/projects.ts — the
// server enforces this list regardless of what's rendered here, but the
// UI shouldn't offer choices the server will just reject. DESIGN_READY,
// REQUESTING_QUOTES, and PROFESSIONAL_SELECTED are reached automatically
// by real actions elsewhere (Phases 6/8) and are deliberately not
// offered as manual choices.
const MANUAL_STATUSES = ["COLLECTING_INFORMATION", "DESIGNING", "COMPLETED", "CANCELLED"] as const;

export function StatusForm({ projectId, currentStatus }: { projectId: string; currentStatus: string }) {
  const boundAction = updateProjectStatus.bind(null, projectId);
  const [state, action, pending] = useActionState<ActionState, FormData>(boundAction, undefined);

  // If the project is currently at an automated-only status (e.g.
  // PROFESSIONAL_SELECTED), it still needs to appear as the selected
  // value so the dropdown doesn't silently show something else — it's
  // just not offered as a fresh choice once you pick something different.
  const isCurrentManual = (MANUAL_STATUSES as readonly string[]).includes(currentStatus);
  const options = isCurrentManual ? MANUAL_STATUSES : [currentStatus, ...MANUAL_STATUSES];

  return (
    <form action={action} className="flex items-center gap-2">
      <select name="status" defaultValue={currentStatus} className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900">
        {options.map((s) => (
          <option key={s} value={s} disabled={s === currentStatus && !isCurrentManual}>
            {s === currentStatus && !isCurrentManual ? `${s} (reached automatically)` : s}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending} className="rounded-full border border-black px-3 py-1 text-sm disabled:opacity-50 dark:border-white">
        {pending ? "Saving…" : "Update status"}
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
