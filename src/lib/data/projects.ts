import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { UserRole } from "@/generated/prisma/client";

/**
 * The ownership/authorization boundary this phase exists to prove: a
 * homeowner only ever gets rows where `homeownerId` matches the caller
 * they just authenticated as (never a value taken from the request), a
 * professional only gets projects they've been sent a quote request for
 * (none exist until Phase 8, so professionals get nothing here yet), and
 * everyone else gets a 404 — not a 403, so an unauthorized user can't tell
 * a real project id from a nonexistent one.
 */
export const getProject = cache(async (projectId: string) => {
  const user = await requireUser();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      photos: { orderBy: { uploadOrder: "asc" } },
      requirements: true,
      designConcepts: { orderBy: { version: "asc" } },
    },
  });

  if (!project) notFound();

  const isOwner = project.homeownerId === user.id;
  const isAdmin = user.role === UserRole.ADMIN;
  const isAuthorizedProfessional =
    user.role === UserRole.PROFESSIONAL
      ? await prisma.quoteRequest.findFirst({
          where: { projectId, professional: { userId: user.id } },
          select: { id: true },
        })
      : null;

  if (!isOwner && !isAdmin && !isAuthorizedProfessional) notFound();

  return project;
});

/** Only the owning homeowner may pass this check — professionals and admins get read access via getProject(), never write access. */
export async function requireProjectOwner(projectId: string) {
  const user = await requireUser();
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.homeownerId !== user.id) notFound();
  return project;
}

export async function listHomeownerProjects() {
  const user = await requireUser();
  return prisma.project.findMany({
    where: { homeownerId: user.id },
    orderBy: { updatedAt: "desc" },
  });
}
