import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSignedPhotoUrl } from "@/lib/storage";
import { deletePortfolioPhoto } from "@/lib/actions/portfolio";
import { UserRole } from "@/generated/prisma/client";
import { PortfolioUploadForm } from "./PortfolioUploadForm";

export default async function PortfolioPage() {
  const user = await requireRole(UserRole.PROFESSIONAL);
  const professional = await prisma.professional.findUnique({ where: { userId: user.id } });
  if (!professional) return null;

  const photos = await prisma.professionalPortfolioPhoto.findMany({
    where: { professionalId: professional.id },
    orderBy: { uploadOrder: "asc" },
  });
  const photoUrls = await Promise.all(photos.map((p) => getSignedPhotoUrl(p.storagePath)));

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-6 py-16 text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />

      <div className="relative flex w-full max-w-2xl flex-col gap-6">
        <div>
          <Link href="/dashboard" className="text-sm text-zinc-600 underline">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Portfolio</h1>
          <p className="text-sm text-zinc-500">
            Optional — a few photos of past work homeowners see upfront on your quotes, before they decide who to pick. Up to 6
            photos.
          </p>
        </div>

        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, i) => (
              <div key={photo.id} className="flex flex-col gap-1">
                {photoUrls[i] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrls[i]!} alt="Portfolio" className="aspect-square rounded-lg border border-zinc-200 object-cover" />
                )}
                <form action={deletePortfolioPhoto.bind(null, photo.id)}>
                  <button type="submit" className="text-xs text-red-600 underline">
                    Delete
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        {photos.length < 6 && <PortfolioUploadForm />}
      </div>
    </div>
  );
}
