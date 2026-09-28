import Link from "next/link";
import { requireProjectOwnerOrGuest } from "@/lib/data/projects";
import { prisma } from "@/lib/prisma";
import { getProjectTypeDefinition } from "@/lib/project-types";
import { computeProfileStatus } from "@/lib/assistant";
import { AssistantChatForm } from "./AssistantChatForm";

export default async function AssistantPage(props: PageProps<"/projects/[id]/assistant">) {
  const { id } = await props.params;
  const project = await requireProjectOwnerOrGuest(id);

  const [requirements, messages] = await Promise.all([
    prisma.projectRequirements.findUnique({ where: { projectId: id } }),
    prisma.assistantMessage.findMany({ where: { projectId: id }, orderBy: { createdAt: "asc" } }),
  ]);

  const definition = getProjectTypeDefinition(project.projectType);
  const existingData = (requirements?.data as Record<string, unknown>) ?? {};
  const status = definition ? computeProfileStatus(definition, existingData) : null;

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-6 py-16 text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />

      <div className="relative flex w-full max-w-2xl flex-col gap-6">
        <div>
          <Link href={`/projects/${id}`} className="text-sm text-zinc-600 underline">
            ← {project.title}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">GlowUpp assistant</h1>
        </div>

        {status && (
          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm">
            <p className="text-zinc-600">
              {status.knownFields.length} of {status.knownFields.length + status.missingFields.length} details known.
            </p>
            {status.missingFields.length > 0 && (
              <p className="mt-1 text-zinc-500">Still needed: {status.missingFields.map((f) => f.label).join(", ")}</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          {messages.length === 0 && (
            <p className="text-sm text-zinc-500">
              Tell it what you&apos;re picturing — GlowUpp will ask what it still needs to know and fill in the project brief as you go.
            </p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.role === "user" ? "self-end bg-[#3a6694] text-white" : "self-start border border-zinc-200 bg-blue-50"
              }`}
            >
              {m.content}
            </div>
          ))}
        </div>

        <AssistantChatForm projectId={id} />
      </div>
    </div>
  );
}
