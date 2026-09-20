"use client";

import { useActionState } from "react";
import { updateProjectRequirements, type ActionState } from "@/lib/actions/projects";
import type { ProjectTypeDefinition } from "@/lib/project-types";

export function RequirementsForm({
  projectId,
  definition,
  existingData,
}: {
  projectId: string;
  definition: ProjectTypeDefinition;
  existingData: Record<string, unknown>;
}) {
  const boundAction = updateProjectRequirements.bind(null, projectId);
  const [state, action, pending] = useActionState<ActionState, FormData>(boundAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      {definition.fields.map((field) => {
        const existing = existingData[field.key];
        return (
          <label key={field.key} className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
              {field.label}
              {field.required ? " *" : ""}
            </span>
            {field.type === "select" ? (
              <select name={field.key} defaultValue={typeof existing === "string" ? existing : ""} className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
                <option value="" />
                {field.options?.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : field.type === "multiselect" ? (
              <div className="flex flex-wrap gap-3">
                {field.options?.map((o) => (
                  <label key={o} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      name={field.key}
                      value={o}
                      defaultChecked={Array.isArray(existing) && existing.includes(o)}
                    />
                    {o}
                  </label>
                ))}
              </div>
            ) : field.type === "boolean" ? (
              <input type="checkbox" name={field.key} defaultChecked={existing === true} />
            ) : field.type === "number" ? (
              <input type="number" name={field.key} defaultValue={typeof existing === "number" ? existing : ""} className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
            ) : field.type === "textarea" ? (
              <textarea name={field.key} defaultValue={typeof existing === "string" ? existing : ""} className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
            ) : (
              <input type="text" name={field.key} defaultValue={typeof existing === "string" ? existing : ""} className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
            )}
          </label>
        );
      })}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.info && <p className="text-sm text-green-700 dark:text-green-400">{state.info}</p>}

      <button type="submit" disabled={pending} className="self-start rounded-full bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black">
        {pending ? "Saving…" : "Save requirements"}
      </button>
    </form>
  );
}
