import { requireRole } from "@/lib/auth";
import { UserRole } from "@/generated/prisma/client";
import { OnboardingForm } from "./OnboardingForm";

export default async function ProfessionalOnboardingPage() {
  await requireRole(UserRole.PROFESSIONAL);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 py-16 dark:bg-black">
      <h1 className="text-2xl font-semibold">Set up your professional profile</h1>
      <OnboardingForm />
    </div>
  );
}
