"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProjectOwner } from "@/lib/data/projects";
import { getProjectTypeDefinition, schemaForProjectType } from "@/lib/project-types";
import { runAssistantTurn, PROJECT_LEVEL_FIELD_KEYS } from "@/lib/assistant";
import { poundsToPence } from "@/lib/money";
import type { Prisma } from "@/generated/prisma/client";

export type ActionState = { error?: string } | undefined;

const ProjectLevelSchema = z.object({
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().nonnegative().optional(),
  targetStartDate: z.string().date().optional(),
});

export async function sendAssistantMessage(projectId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const project = await requireProjectOwner(projectId);

  const message = (formData.get("message") as string | null)?.trim();
  if (!message) return { error: "Type a message first." };

  const definition = getProjectTypeDefinition(project.projectType);
  if (!definition) return { error: "This project's type is no longer recognized." };

  const [requirements, priorMessages, messageCount] = await Promise.all([
    prisma.projectRequirements.findUnique({ where: { projectId } }),
    prisma.assistantMessage.findMany({ where: { projectId }, orderBy: { createdAt: "asc" }, take: 40 }),
    prisma.assistantMessage.count({ where: { projectId } }),
  ]);

  const existingData = (requirements?.data as Record<string, unknown>) ?? {};

  await prisma.assistantMessage.create({ data: { projectId, role: "user", content: message } });

  if (messageCount === 0) {
    await prisma.activityLog.create({ data: { type: "assistant_started", actorId: project.homeownerId, projectId } });
  }

  let result;
  try {
    result = await runAssistantTurn({
      project: {
        title: project.title,
        description: project.description,
        postcode: project.postcode,
        budgetMin: project.budgetMin,
        budgetMax: project.budgetMax,
        targetStartDate: project.targetStartDate,
      },
      definition,
      requirementsData: existingData,
      history: priorMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      userMessage: message,
    });
  } catch (err) {
    console.error("Assistant turn failed:", err);
    return { error: "The assistant is unavailable right now — please try again in a moment." };
  }

  await prisma.assistantMessage.create({ data: { projectId, role: "assistant", content: result.reply } });

  // Split the AI's structured update into project-level fields vs. the
  // type-specific requirements JSON, then validate each through the exact
  // same schemas the manual forms use (Phase 3) — the assistant never gets
  // a separate, looser write path than a human editing the form directly.
  const projectLevelRaw: Record<string, unknown> = {};
  const requirementsRaw: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(result.updates)) {
    if (value === undefined || value === null) continue;
    if (PROJECT_LEVEL_FIELD_KEYS.includes(key)) projectLevelRaw[key] = value;
    else requirementsRaw[key] = value;
  }

  let wroteAnything = false;

  if (Object.keys(requirementsRaw).length > 0) {
    try {
      const validated = schemaForProjectType(definition).parse(requirementsRaw);
      const merged = { ...existingData, ...validated };
      await prisma.projectRequirements.upsert({
        where: { projectId },
        create: { projectId, data: merged as Prisma.InputJsonValue },
        update: { data: merged as Prisma.InputJsonValue },
      });
      wroteAnything = true;
    } catch (err) {
      // The assistant hallucinated a field or an invalid value — drop the
      // update rather than write bad data. The user still sees the reply.
      console.error("Assistant returned invalid requirements update, discarded:", err);
    }
  }

  const parsedProjectLevel = ProjectLevelSchema.safeParse(projectLevelRaw);
  if (parsedProjectLevel.success) {
    const { budgetMin, budgetMax, targetStartDate } = parsedProjectLevel.data;
    const effectiveMin = budgetMin !== undefined ? poundsToPence(budgetMin) : project.budgetMin;
    const effectiveMax = budgetMax !== undefined ? poundsToPence(budgetMax) : project.budgetMax;
    const budgetOrderOk = effectiveMin === null || effectiveMax === null || effectiveMin <= effectiveMax;

    const projectUpdateData: Record<string, unknown> = {};
    if (budgetOrderOk) {
      if (budgetMin !== undefined) projectUpdateData.budgetMin = poundsToPence(budgetMin);
      if (budgetMax !== undefined) projectUpdateData.budgetMax = poundsToPence(budgetMax);
    }
    if (targetStartDate !== undefined) projectUpdateData.targetStartDate = new Date(targetStartDate);

    if (Object.keys(projectUpdateData).length > 0) {
      await prisma.project.update({ where: { id: projectId }, data: projectUpdateData });
      wroteAnything = true;
    }
  }

  if (wroteAnything) {
    await prisma.activityLog.create({ data: { type: "requirement_updated", actorId: project.homeownerId, projectId } });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/assistant`);
  return undefined;
}
