import { redirect } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, VerificationStatus } from "@/generated/prisma/client";
import { VerificationForm } from "./VerificationForm";

const STATUS_COPY: Record<VerificationStatus, string> = {
  UNVERIFIED: "You haven't submitted anything yet.",
  PENDING: "Submitted — we'll review it and update your badge soon.",
  VERIFIED: "You're verified! Your quotes show a Verified badge to homeowners.",
  REJECTED: "Your last submission wasn't accepted. You can upload a new one below.",
};

export default async function VerificationPage() {
  const user = await requireRole(UserRole.PROFESSIONAL);
  const professional = await prisma.professional.findUnique({ where: { userId: user.id } });
  if (!professional) redirect("/professional/onboarding");

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-6 py-16 text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />

      <div className="relative flex w-full max-w-2xl flex-col gap-6">
        <div>
          <Link href="/dashboard" className="text-sm text-zinc-600 underline">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Get verified</h1>
          <p className="text-sm text-zinc-500">
            Completely optional — you can quote on projects with or without this. Upload your public liability insurance
            certificate and, once approved, homeowners see a Verified badge on your quotes — a real edge when they&apos;re
            comparing who to pick.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-sm font-medium">Status: {professional.verificationStatus}</p>
          <p className="text-sm text-zinc-500">{STATUS_COPY[professional.verificationStatus]}</p>
        </div>

        <VerificationForm />
        {professional.verificationStatus === VerificationStatus.VERIFIED && (
          <p className="text-xs text-zinc-500">Uploading a new document (e.g. renewed insurance) sends you back for re-review.</p>
        )}
      </div>
    </div>
  );
}
