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
  if (!professional) return null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 bg-zinc-50 px-6 py-16 dark:bg-black">
      <div>
        <Link href="/dashboard" className="text-sm text-zinc-600 underline dark:text-zinc-400">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Get verified</h1>
        <p className="text-sm text-zinc-500">
          Completely optional — you can quote on projects with or without this. Upload your public liability insurance
          certificate and, once approved, homeowners see a Verified badge on your quotes — a real edge when they&apos;re
          comparing who to pick.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-300 px-4 py-3 dark:border-zinc-700">
        <p className="text-sm font-medium">Status: {professional.verificationStatus}</p>
        <p className="text-sm text-zinc-500">{STATUS_COPY[professional.verificationStatus]}</p>
      </div>

      <VerificationForm />
      {professional.verificationStatus === VerificationStatus.VERIFIED && (
        <p className="text-xs text-zinc-500">Uploading a new document (e.g. renewed insurance) sends you back for re-review.</p>
      )}
    </div>
  );
}
