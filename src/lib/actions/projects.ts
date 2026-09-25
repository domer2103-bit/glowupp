"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { requireProjectOwner } from "@/lib/data/projects";
import { UserRole, ProjectStatus, type Prisma } from "@/generated/prisma/client";
import { PROJECT_TYPE_KEYS, getProjectTypeDefinition, validateRequirementsData } from "@/lib/project-types";
import { poundsToPence } from "@/lib/money";
import { checkRateLimit } from "@/lib/rate-limit";

export type ActionState = { error?: string; info?: string } | undefined;

const ProjectInputSchema = z
  .object({
    projectType: z.enum(PROJECT_TYPE_KEYS),
    title: z.string().trim().min(3, "Title must be at least 3 characters.").max(200),
    description: z.string().trim().max(5000).optional(),
    postcode: z.string().trim().min(5, "Enter a valid UK postcode.").max(10),
    budgetMin: z.coerce.number().int().nonnegative("Budget can't be negative.").optional(),
    budgetMax: z.coerce.number().int().nonnegative("Budget can't be negative.").optional(),
    targetStartDate: z.string().date("Enter a valid date.").optional(),
  })
  .refine((data) => data.budgetMin === undefined || data.budgetMax === undefined || data.budgetMin <= data.budgetMax, {
    message: "Minimum budget can't be greater than maximum budget.",
    path: ["budgetMax"],
  });

function readProjectInput(formData: FormData) {
  return ProjectInputSchema.safeParse({
    projectType: formData.get("projectType"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    postcode: formData.get("postcode"),
    budgetMin: formData.get("budgetMin") || undefined,
    budgetMax: formData.get("budgetMax") || undefined,
    targetStartDate: formData.get("targetStartDate") || undefined,
  });
}

export async function createProject(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(UserRole.HOMEOWNER);

  if (!checkRateLimit(`create-project:${user.id}`, 10, 60 * 60 * 1000)) {
    return { error: "You're creating projects too quickly — please try again later." };
  }

  const parsed = readProjectInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }
  const { projectType, title, description, postcode, budgetMin, budgetMax, targetStartDate } = parsed.data;

  const project = await prisma.project.create({
    data: {
      homeownerId: user.id,
      projectType,
      title,
      description,
      postcode,
      budgetMin: budgetMin !== undefined ? poundsToPence(budgetMin) : undefined,
      budgetMax: budgetMax !== undefined ? poundsToPence(budgetMax) : undefined,
      targetStartDate: targetStartDate ? new Date(targetStartDate) : undefined,
      status: ProjectStatus.DRAFT,
    },
  });

  await prisma.activityLog.create({
    data: { type: "project_created", actorId: user.id, projectId: project.id },
  });

  redirect(`/projects/${project.id}`);
}

export async function updateProject(projectId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const project = await requireProjectOwner(projectId);

  const parsed = readProjectInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }
  const { projectType, title, description, postcode, budgetMin, budgetMax, targetStartDate } = parsed.data;

  await prisma.project.update({
    where: { id: project.id },
    data: {
      projectType,
      title,
      description,
      postcode,
      budgetMin: budgetMin !== undefined ? poundsToPence(budgetMin) : null,
      budgetMax: budgetMax !== undefined ? poundsToPence(budgetMax) : null,
      targetStartDate: targetStartDate ? new Date(targetStartDate) : null,
    },
  });

  revalidatePath(`/projects/${project.id}`);
  return { info: "Project updated." };
}

const StatusSchema = z.enum([
  ProjectStatus.DRAFT,
  ProjectStatus.COLLECTING_INFORMATION,
  ProjectStatus.DESIGNING,
  ProjectStatus.DESIGN_READY,
  ProjectStatus.REQUESTING_QUOTES,
  ProjectStatus.QUOTES_RECEIVED,
  ProjectStatus.PROFESSIONAL_SELECTED,
  ProjectStatus.COMPLETED,
  ProjectStatus.CANCELLED,
]);

/**
 * Security/integrity fix (Phase 12 review): DESIGN_READY,
 * REQUESTING_QUOTES, and PROFESSIONAL_SELECTED are now all reached
 * automatically by real actions elsewhere (selectDesignConcept,
 * pushToOpenMarket, selectProfessional) — letting a homeowner manually jump
 * straight to one of them here would let a project claim a milestone
 * that never actually happened (e.g. PROFESSIONAL_SELECTED with no
 * selected QuoteRequest or Transaction behind it). QUOTES_RECEIVED and
 * DRAFT are excluded too: QUOTES_RECEIVED is an outcome of professionals
 * responding, not a deliberate homeowner choice, and DRAFT is the
 * create-time-only starting point. What's left is exactly the set of
 * statuses that make sense as a deliberate manual choice regardless of
 * where the project's automated progress currently stands.
 */
const MANUALLY_SETTABLE_STATUSES: ProjectStatus[] = [
  ProjectStatus.COLLECTING_INFORMATION,
  ProjectStatus.DESIGNING,
  ProjectStatus.COMPLETED,
  ProjectStatus.CANCELLED,
];

export async function updateProjectStatus(projectId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const project = await requireProjectOwner(projectId);

  const parsed = StatusSchema.safeParse(formData.get("status"));
  if (!parsed.success) return { error: "Not a valid project status." };

  // Leaving the status unchanged is always a harmless no-op (the form's
  // dropdown defaults to the current value); anything that's actually a
  // change is only allowed into one of the manually-appropriate statuses.
  if (parsed.data !== project.status && !MANUALLY_SETTABLE_STATUSES.includes(parsed.data)) {
    return { error: "That status can only be reached automatically, not set directly." };
  }

  await prisma.project.update({ where: { id: project.id }, data: { status: parsed.data } });
  await prisma.activityLog.create({
    data: {
      type: "project_status_changed",
      actorId: project.homeownerId,
      projectId: project.id,
      metadata: { from: project.status, to: parsed.data },
    },
  });

  revalidatePath(`/projects/${project.id}`);
  return { info: "Status updated." };
}

export async function updateProjectRequirements(projectId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const project = await requireProjectOwner(projectId);

  const definition = getProjectTypeDefinition(project.projectType);
  if (!definition) return { error: "This project's type is no longer recognized." };

  const raw: Record<string, unknown> = {};
  for (const field of definition.fields) {
    if (field.type === "multiselect") {
      raw[field.key] = formData.getAll(field.key);
    } else if (field.type === "boolean") {
      raw[field.key] = formData.get(field.key) === "on";
    } else if (field.type === "number") {
      const value = formData.get(field.key);
      raw[field.key] = value ? Number(value) : undefined;
    } else {
      const value = formData.get(field.key);
      raw[field.key] = value && value !== "" ? value : undefined;
    }
  }

  let validated;
  try {
    validated = validateRequirementsData(project.projectType, raw);
  } catch (err) {
    return { error: err instanceof z.ZodError ? (err.issues[0]?.message ?? "Invalid requirements data.") : "Invalid requirements data." };
  }

  // Zod's dynamically-built schema infers a shape TS can't structurally
  // match against Prisma's InputJsonValue union — the runtime data is
  // already validated JSON-safe (strings/numbers/booleans/arrays only).
  const requirementsData = validated as Prisma.InputJsonValue;

  await prisma.projectRequirements.upsert({
    where: { projectId: project.id },
    create: { projectId: project.id, data: requirementsData },
    update: { data: requirementsData },
  });

  await prisma.activityLog.create({
    data: { type: "requirement_updated", actorId: project.homeownerId, projectId: project.id },
  });

  revalidatePath(`/projects/${project.id}`);
  return { info: "Requirements saved." };
}
