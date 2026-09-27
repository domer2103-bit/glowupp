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
    <form action={action} className="flex flex-col gap-4">
      {definition.fields.map((field) => {
        const existing = existingData[field.key];
        return (
          <label key={field.key} className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[#132a4d]">
              {field.label}
              {field.required ? " *" : ""}
            </span>
            {field.type === "select" ? (
              <select
                name={field.key}
                defaultValue={typeof existing === "string" ? existing : ""}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-[#132a4d] focus:border-[#3a6694] focus:outline-none"
              >
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
                  <label key={o} className="flex items-center gap-1.5 text-zinc-600">
                    <input
                      type="checkbox"
                      name={field.key}
                      value={o}
                      defaultChecked={Array.isArray(existing) && existing.includes(o)}
                      className="accent-[#3a6694]"
                    />
                    {o}
                  </label>
                ))}
              </div>
            ) : field.type === "boolean" ? (
              <input type="checkbox" name={field.key} defaultChecked={existing === true} className="h-4 w-4 accent-[#3a6694]" />
            ) : field.type === "number" ? (
              <input
                type="number"
                name={field.key}
                defaultValue={typeof existing === "number" ? existing : ""}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-[#132a4d] focus:border-[#3a6694] focus:outline-none"
              />
            ) : field.type === "textarea" ? (
              <textarea
                name={field.key}
                defaultValue={typeof existing === "string" ? existing : ""}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-[#132a4d] focus:border-[#3a6694] focus:outline-none"
              />
            ) : (
              <input
                type="text"
                name={field.key}
                defaultValue={typeof existing === "string" ? existing : ""}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-[#132a4d] focus:border-[#3a6694] focus:outline-none"
              />
            )}
          </label>
        );
      })}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.info && <p className="text-sm text-emerald-700">{state.info}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-[#3a6694] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2c5075] disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save requirements"}
      </button>
    </form>
  );
}
