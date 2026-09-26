import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAllProfessionals } from "@/lib/data/admin";
import { updateProfessionalVerification } from "@/lib/actions/admin";
import { getSignedPhotoUrl } from "@/lib/storage";
import { UserRole, VerificationStatus } from "@/generated/prisma/client";

export default async function AdminProfessionalsPage() {
  await requireRole(UserRole.ADMIN);
  const professionals = await getAllProfessionals();
  const documentUrls = await Promise.all(
    professionals.map((pro) => (pro.verificationDocumentPath ? getSignedPhotoUrl(pro.verificationDocumentPath) : null))
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 bg-zinc-50 px-6 py-16 dark:bg-black">
      <div>
        <Link href="/admin" className="text-sm text-zinc-600 underline dark:text-zinc-400">
          ← Admin
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Professionals</h1>
      </div>

      {professionals.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">No professionals yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {professionals.map((pro, i) => (
            <li key={pro.id} className="flex flex-col gap-2 rounded-lg border border-zinc-300 px-4 py-3 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <span className="font-medium">{pro.businessName}</span>
                <span className="text-xs text-zinc-500">{pro.verificationStatus}</span>
              </div>
              <p className="text-sm text-zinc-500">
                {pro.user.name} · {pro.user.email} · {pro.postcode}
              </p>
              <p className="text-xs text-zinc-500">
                Services: {pro.services.map((s) => s.projectType).join(", ") || "none set"} · Serves:{" "}
                {pro.serviceAreaPrefixes.join(", ") || "none set"}
              </p>
              <p className="text-xs text-zinc-500">
                {documentUrls[i] ? (
                  <a href={documentUrls[i]!} target="_blank" rel="noreferrer" className="underline">
                    View submitted document
                  </a>
                ) : (
                  "No document submitted"
                )}
              </p>
              <div className="flex gap-2">
                {pro.verificationStatus !== VerificationStatus.VERIFIED && (
                  <form action={updateProfessionalVerification.bind(null, pro.id, VerificationStatus.VERIFIED)}>
                    <button type="submit" className="rounded-full bg-black px-3 py-1 text-xs text-white dark:bg-white dark:text-black">
                      Verify
                    </button>
                  </form>
                )}
                {pro.verificationStatus !== VerificationStatus.REJECTED && (
                  <form action={updateProfessionalVerification.bind(null, pro.id, VerificationStatus.REJECTED)}>
                    <button type="submit" className="rounded-full border border-red-600 px-3 py-1 text-xs text-red-600">
                      Reject
                    </button>
                  </form>
                )}
                {pro.verificationStatus !== VerificationStatus.UNVERIFIED && (
                  <form action={updateProfessionalVerification.bind(null, pro.id, VerificationStatus.UNVERIFIED)}>
                    <button type="submit" className="rounded-full border border-zinc-400 px-3 py-1 text-xs text-zinc-600 dark:text-zinc-400">
                      Reset to unverified
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
