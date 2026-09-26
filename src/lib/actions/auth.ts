"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/client";
import { PROJECT_TYPE_KEYS } from "@/lib/project-types";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export type ActionState = { error?: string; info?: string } | undefined;

const SignupSchema = z.object({
  role: z.enum([UserRole.HOMEOWNER, UserRole.PROFESSIONAL]),
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[a-zA-Z]/, "Password must contain a letter.")
    .regex(/[0-9]/, "Password must contain a number."),
  postcode: z.string().trim().min(5, "Enter a valid UK postcode.").optional(),
  // Carried through from a /redesign/[type] landing page's "sign up to
  // get started" CTA (src/app/signup/page.tsx reads it from the URL and
  // the form embeds it as a hidden field) — lets a new homeowner land
  // straight on "new kitchen project" instead of a blank form.
  projectType: z.enum(PROJECT_TYPE_KEYS).optional(),
});

/**
 * Creates the Supabase auth user. Role/name/postcode ride along in
 * `options.data`, which the `handle_new_auth_user` trigger
 * (prisma/migrations/20260918234225_auth_trigger_and_rls) reads to create
 * the matching `public.users` row — the trigger is the source of truth for
 * that row, this action never writes to `users` directly.
 */
export async function signup(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await getClientIp();
  if (!checkRateLimit(`signup:${ip}`, 5, 60 * 60 * 1000)) {
    return { error: "Too many accounts created from this location — please try again later." };
  }

  const parsed = SignupSchema.safeParse({
    role: formData.get("role"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    postcode: formData.get("postcode") || undefined,
    projectType: formData.get("projectType") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const { role, name, email, password, postcode, projectType } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role, name, postcode },
      // Explicit rather than relying on the Supabase project's Site URL
      // default — that default had been left at a leftover dev value
      // (localhost:3000) even after this app went to production,
      // silently breaking every confirmation email's link. The type
      // param (when present) survives the confirm-email round trip so
      // a /redesign/[type] signup still lands on the right project type
      // even when email confirmation is required, not just when
      // Supabase grants an immediate session.
      emailRedirectTo: `${process.env.APP_URL}/login?confirmed=1${projectType ? `&type=${projectType}` : ""}`,
    },
  });

  if (error) return { error: error.message };

  // Supabase projects with "Confirm email" on don't return a session here —
  // the account exists but can't log in until the confirmation link is
  // clicked. Either way, the trigger has already created the users row.
  if (!data.session) {
    return { info: "Account created — check your email to confirm it before logging in." };
  }

  if (role === UserRole.PROFESSIONAL) redirect("/professional/onboarding");
  redirect(projectType ? `/projects/new?type=${projectType}` : "/dashboard");
}

const LoginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  // Carried through from /login?type=X — the fallback path for a
  // /redesign/[type] signup when Supabase required email confirmation,
  // so the chosen category isn't lost just because signup couldn't
  // grant an immediate session (see signup()'s emailRedirectTo above).
  projectType: z.enum(PROJECT_TYPE_KEYS).optional(),
});

export async function login(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    projectType: formData.get("projectType") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  // Keyed by the target email, not the caller's IP — this is what stops
  // repeated password guessing against one account regardless of how many
  // different IPs an attacker uses.
  if (!checkRateLimit(`login:${parsed.data.email.toLowerCase()}`, 10, 15 * 60 * 1000)) {
    return { error: "Too many login attempts for this account — please try again in a few minutes." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return { error: error.message };

  if (parsed.data.projectType) {
    const dbUser = await prisma.user.findUnique({ where: { id: data.user.id } });
    if (dbUser?.role === UserRole.HOMEOWNER) {
      redirect(`/projects/new?type=${parsed.data.projectType}`);
    }
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const ProfessionalProfileSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is required."),
  postcode: z.string().trim().min(5, "Enter a valid UK postcode."),
  description: z.string().trim().max(2000).optional(),
  services: z
    .array(z.enum(PROJECT_TYPE_KEYS))
    .min(1, "Pick at least one service you offer."),
  // Comma-separated postcode outward-code prefixes, e.g. "L1, L18" or "L"
  // for a whole area — parsed into an array of upper-cased, deduplicated
  // prefixes. See src/lib/matching.ts for how these are used.
  serviceAreaPrefixes: z
    .string()
    .trim()
    .min(1, "Enter at least one postcode area or district you serve, e.g. \"L\" or \"L1, L18\".")
    .transform((value) =>
      Array.from(new Set(value.split(",").map((p) => p.trim().toUpperCase()).filter(Boolean)))
    ),
});

/** Creates the Professional business profile for the signed-in user. Requires role=PROFESSIONAL; one profile per user (unique on user_id). */
export async function createProfessionalProfile(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  if (user.role !== UserRole.PROFESSIONAL) {
    return { error: "Only professional accounts can create a business profile." };
  }

  const parsed = ProfessionalProfileSchema.safeParse({
    businessName: formData.get("businessName"),
    postcode: formData.get("postcode"),
    description: formData.get("description") || undefined,
    services: formData.getAll("services"),
    serviceAreaPrefixes: formData.get("serviceAreaPrefixes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const { businessName, postcode, description, services, serviceAreaPrefixes } = parsed.data;

  await prisma.professional.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      businessName,
      postcode,
      description,
      serviceAreaPrefixes,
      services: { create: services.map((projectType) => ({ projectType })) },
    },
    update: {
      businessName,
      postcode,
      description,
      serviceAreaPrefixes,
      services: {
        deleteMany: {},
        create: services.map((projectType) => ({ projectType })),
      },
    },
  });

  redirect("/dashboard");
}
