import Link from "next/link";
import { HOMEPAGE_CATEGORIES } from "@/lib/homepage-categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@/generated/prisma/client";
import { EarlyBirdCountdown } from "@/components/EarlyBirdCountdown";

export default async function ProfessionalsPage() {
  // This is the recruitment page — someone already signed up as a professional has nothing to "get started" with, so send them to their dashboard instead.
  const user = await getCurrentUser();
  const isProfessional = user?.role === UserRole.PROFESSIONAL;
  const ctaHref = isProfessional ? "/dashboard" : "/signup?role=professional";

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-gradient-to-b from-blue-50 to-white text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />
      <div className="pointer-events-none absolute top-52 -left-32 h-96 w-96 rounded-full bg-blue-300/35 blur-2xl" />
      <div className="pointer-events-none absolute bottom-0 right-10 h-72 w-72 rounded-full bg-blue-300/35 blur-2xl" />

      <section className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 py-16 text-center">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">For Professionals</span>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          Grow Your Business With Glow<span className="text-[#3a6694]">Upp</span>.
        </h1>
        <p className="max-w-md text-zinc-600">
          Homeowners upload a photo, see an AI redesign, and come to GlowUpp ready to hire. Get discovered by the ones
          looking for exactly what you do.
        </p>
        {!isProfessional && <EarlyBirdCountdown className="mt-2 max-w-md" />}
        <Link
          href={ctaHref}
          className="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-[#3a6694] px-6 py-3 text-sm font-medium text-white hover:bg-[#2c5075]"
        >
          {isProfessional ? "Go to your dashboard →" : "Get Started →"}
        </Link>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-6 py-12">
        <h2 className="mb-6 text-center text-2xl font-semibold">Which trade are you?</h2>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {HOMEPAGE_CATEGORIES.map((cat) => (
            <div
              key={cat.key}
              className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-4 text-center shadow-sm"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-[#3a6694]">
                <CategoryIcon type={cat.key} className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium">{cat.displayName}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-6 py-12 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="mb-1 font-semibold text-[#132a4d]">1. Set up your profile</p>
          <p className="text-sm text-zinc-600">Tell us what you do and where you work — takes a few minutes.</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="mb-1 font-semibold text-[#132a4d]">2. Get matched</p>
          <p className="text-sm text-zinc-600">We send you homeowners in your area who already have a design in mind.</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="mb-1 font-semibold text-[#132a4d]">3. Quote and win the job</p>
          <p className="text-sm text-zinc-600">Message the homeowner directly and send a quote — no bidding wars.</p>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-3xl px-6 pb-16 text-center">
        <Link
          href={ctaHref}
          className="inline-flex w-fit items-center gap-2 rounded-full bg-[#3a6694] px-6 py-3 text-sm font-medium text-white hover:bg-[#2c5075]"
        >
          {isProfessional ? "Go to your dashboard →" : "Create Your Free Profile →"}
        </Link>
      </section>
    </div>
  );
}
