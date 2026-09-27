import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, getCurrentUser } from "@/lib/auth";
import { getOrCreateGuestUser } from "@/lib/guest";
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

/**
 * Same shape as getProject, but also lets an anonymous visitor view a
 * project their guest cookie created (src/lib/guest.ts) — the results
 * page (/projects/[id]) needs to work for a guest who just generated a
 * design without ever signing in. Returns `{ project, isGuest }` so the
 * page can gate the sign-in-required actions (download, push to market)
 * without gating the page itself.
 */
export const getProjectForOwnerOrGuest = cache(async (projectId: string) => {
  const currentUser = await getCurrentUser();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      photos: { orderBy: { uploadOrder: "asc" } },
      requirements: true,
      designConcepts: { orderBy: { version: "asc" } },
    },
  });
  if (!project) notFound();

  if (currentUser) {
    const isOwner = project.homeownerId === currentUser.id;
    const isAdmin = currentUser.role === UserRole.ADMIN;
    const isAuthorizedProfessional =
      currentUser.role === UserRole.PROFESSIONAL
        ? await prisma.quoteRequest.findFirst({ where: { projectId, professional: { userId: currentUser.id } }, select: { id: true } })
        : null;
    if (isOwner || isAdmin || isAuthorizedProfessional) return { project, isGuest: false };
    notFound();
  }

  const guest = await getOrCreateGuestUser();
  if (!guest || project.homeownerId !== guest.id) notFound();
  return { project, isGuest: true };
});

/** Only the owning homeowner may pass this check — professionals and admins get read access via getProject(), never write access. */
export async function requireProjectOwner(projectId: string) {
  const user = await requireUser();
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.homeownerId !== user.id) notFound();
  return project;
}

/**
 * Write-access variant for the login-free wizard's own actions (upload
 * photo, save brief + generate) — accepts a real signed-in owner OR a
 * matching guest cookie, since a guest must be able to drive their own
 * wizard through to a generated design before ever creating an account.
 */
export async function requireProjectOwnerOrGuest(projectId: string) {
  const currentUser = await getCurrentUser();
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) notFound();

  if (currentUser) {
    if (project.homeownerId !== currentUser.id) notFound();
    return project;
  }

  const guest = await getOrCreateGuestUser();
  if (!guest || project.homeownerId !== guest.id) notFound();
  return project;
}

/**
 * Backs the guided per-category wizard (src/app/redesign/[type]/page.tsx):
 * reuses the caller's existing draft of this type if they left one
 * mid-wizard (so reloading or coming back doesn't fork a second project),
 * otherwise starts a fresh one. Postcode is intentionally blank here — the
 * wizard doesn't ask for it; it's required before pushing to the open
 * market, not before generating a design, and is validated at that point.
 */
export async function getOrCreateDraftProject(homeownerId: string, projectType: string, title: string) {
  const existing = await prisma.project.findFirst({
    where: { homeownerId, projectType, status: "DRAFT" },
    orderBy: { createdAt: "desc" },
    include: { photos: { orderBy: { uploadOrder: "asc" } }, requirements: true },
  });
  if (existing) return existing;

  const created = await prisma.project.create({
    data: { homeownerId, projectType, title, postcode: "", status: "DRAFT" },
  });
  return { ...created, photos: [], requirements: null };
}

export async function listHomeownerProjects() {
  const user = await requireUser();
  return prisma.project.findMany({
    where: { homeownerId: user.id },
    orderBy: { updatedAt: "desc" },
  });
}
