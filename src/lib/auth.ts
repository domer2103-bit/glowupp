import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { UserRole, type User } from "@/generated/prisma/client";

/**
 * The Data Access Layer for auth, per Next.js's recommended pattern
 * (node_modules/next/dist/docs/.../authentication.md, "Creating a Data
 * Access Layer"). Every server action and every page that needs to know
 * who's asking should go through these functions rather than reading the
 * Supabase session directly — this is the one place ownership/role checks
 * live, so they can't be forgotten in a new server action.
 *
 * `cache()` memoizes per request, so calling this multiple times during one
 * render only hits Supabase/Postgres once.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  // If this is null, the on_auth_user_created trigger hasn't run yet
  // (should be near-instant) — treat as "not signed in" rather than crash.
  return prisma.user.findUnique({ where: { id: authUser.id } });
});

/** Redirects to /login if there's no session. Use in pages/server actions that require any authenticated user. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Redirects to /login (no session) or /dashboard (wrong role) unless the user has one of the given roles. */
export async function requireRole(role: UserRole | UserRole[]): Promise<User> {
  const user = await requireUser();
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(user.role)) redirect("/dashboard");
  return user;
}
