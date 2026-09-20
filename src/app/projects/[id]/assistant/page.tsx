import Link from "next/link";
import { requireProjectOwner } from "@/lib/data/projects";
import { prisma } from "@/lib/prisma";
import { getProjectTypeDefinition } from "@/lib/project-types";
import { computeProfileStatus } from "@/lib/assistant";
import { AssistantChatForm } from "./AssistantChatForm";

export default async function AssistantPage(props: PageProps<"/projects/[id]/assistant">) {
  const { id } = await props.params;
  const project = await requireProjectOwner(id);

  const [requirements, messages] = await Promise.all([
    prisma.projectRequirements.findUnique({ where: { projectId: id } }),
    prisma.assistantMessage.findMany({ where: { projectId: id }, orderBy: { createdAt: "asc" } }),
  ]);

  const definition = getProjectTypeDefinition(project.projectType);
  const existingData = (requirements?.data as Record<string, unknown>) ?? {};
  const status = definition ? computeProfileStatus(definition, existingData) : null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 bg-zinc-50 px-6 py-16 dark:bg-black">
      <div>
        <Link href={`/projects/${id}`} className="text-sm text-zinc-600 underline dark:text-zinc-400">
          ← {project.title}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">GlowUpp assistant</h1>
      </div>

      {status && (
        <div className="rounded-lg border border-zinc-300 px-4 py-3 text-sm dark:border-zinc-700">
          <p className="text-zinc-600 dark:text-zinc-400">
            {status.knownFields.length} of {status.knownFields.length + status.missingFields.length} details known.
          </p>
          {status.missingFields.length > 0 && (
            <p className="mt-1 text-zinc-500">Still needed: {status.missingFields.map((f) => f.label).join(", ")}</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500">
            Tell it what you&apos;re picturing — GlowUpp will ask what it still needs to know and fill in the project brief as you go.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              m.role === "user"
                ? "self-end bg-black text-white dark:bg-white dark:text-black"
                : "self-start border border-zinc-300 dark:border-zinc-700"
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>

      <AssistantChatForm projectId={id} />
    </div>
  );
}
