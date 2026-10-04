import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { UserRole, type User } from "@/generated/prisma/client";
import { GUEST_COOKIE } from "@/lib/guest-cookie";

/**
 * Backs the login-free redesign wizard (src/app/redesign/[type]/page.tsx):
 * an anonymous visitor gets a real `users` row (role HOMEOWNER, isGuest
 * true) keyed by the cookie middleware.ts already set, so the rest of the
 * app — project ownership, photo upload, design generation — needs zero
 * guest-specific branching. The row is upserted (not just created) because
 * middleware mints the cookie value before this ever runs, so concurrent
 * requests on first visit must not race into a duplicate-id error.
 *
 * Read-only (`cookies()` can't be written from a Server Component) — if
 * middleware didn't run for this request for some reason, this returns
 * null rather than trying to mint a cookie itself.
 */
export const getOrCreateGuestUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  const guestId = jar.get(GUEST_COOKIE)?.value;
  if (!guestId) return null;

  return prisma.user.upsert({
    where: { id: guestId },
    create: { id: guestId, role: UserRole.HOMEOWNER, name: "Guest", email: `guest-${guestId}@guest.glowupp.local`, isGuest: true },
    update: {},
  });
});

/** The user driving the wizard right now — a real signed-in homeowner if there is one, otherwise their guest identity. Never returns a PROFESSIONAL/ADMIN. */
export async function getWizardUser(currentUser: User | null): Promise<User | null> {
  if (currentUser) return currentUser.role === UserRole.HOMEOWNER ? currentUser : null;
  return getOrCreateGuestUser();
}

/**
 * Called right after a signup/login that produced a real session
 * (src/lib/actions/auth.ts) — folds an anonymous guest's in-progress
 * project(s) into the account they just created/signed into, so browsing
 * and generating designs without an account never costs them that work.
 * Reassigns every project the guest cookie owns (not just one), clears the
 * cookie, and removes the placeholder guest row. A no-op if there was no
 * guest cookie or it didn't point to a real guest row.
 */
export async function mergeGuestIntoUser(realUserId: string): Promise<void> {
  const jar = await cookies();
  const guestId = jar.get(GUEST_COOKIE)?.value;
  if (!guestId || guestId === realUserId) return;

  const guest = await prisma.user.findUnique({ where: { id: guestId } });
  if (!guest || !guest.isGuest) return;

  // Re-point the private-pipeline locks too — their homeowner FK would
  // otherwise cascade-delete with the guest row and silently unlock the
  // project (the contractor's client would vanish on signup).
  await prisma.$transaction([
    prisma.project.updateMany({ where: { homeownerId: guestId }, data: { homeownerId: realUserId } }),
    prisma.privatePipelineSession.updateMany({ where: { homeownerId: guestId }, data: { homeownerId: realUserId } }),
    prisma.quoteRequest.updateMany({ where: { homeownerId: guestId }, data: { homeownerId: realUserId } }),
    prisma.user.delete({ where: { id: guestId } }),
  ]);
  jar.delete(GUEST_COOKIE);
}
