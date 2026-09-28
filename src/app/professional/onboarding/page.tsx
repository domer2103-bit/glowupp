import { requireRole } from "@/lib/auth";
import { UserRole } from "@/generated/prisma/client";
import { OnboardingForm } from "./OnboardingForm";

export default async function ProfessionalOnboardingPage() {
  const user = await requireRole(UserRole.PROFESSIONAL);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-gradient-to-b from-blue-50 to-white text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />
      <div className="pointer-events-none absolute top-52 -left-32 h-96 w-96 rounded-full bg-blue-300/35 blur-2xl" />
      <div className="pointer-events-none absolute bottom-0 right-10 h-72 w-72 rounded-full bg-blue-300/35 blur-2xl" />

      <section className="relative mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-start">
        <div className="flex flex-col gap-4 lg:sticky lg:top-10">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">For Professionals</span>
          <h1 className="text-4xl font-bold leading-tight text-[#132a4d] sm:text-5xl">
            Grow Your Business With Glow<span className="text-[#3a6694]">Upp</span>.
          </h1>
          <p className="max-w-md text-zinc-600">
            Get discovered by homeowners who are ready to transform their space.
          </p>
        </div>

        <OnboardingForm userName={user.name} userEmail={user.email} />
      </section>
    </div>
  );
}
