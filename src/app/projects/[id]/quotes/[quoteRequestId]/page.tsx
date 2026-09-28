import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMessages } from "@/lib/data/messages";
import { prisma } from "@/lib/prisma";
import { getSignedPhotoUrl } from "@/lib/storage";
import { penceToPounds } from "@/lib/money";
import { MessageThread } from "@/components/MessageThread";
import { QuoteRequestStatus, VerificationStatus } from "@/generated/prisma/client";

export default async function QuoteThreadPage(props: PageProps<"/projects/[id]/quotes/[quoteRequestId]">) {
  const { id, quoteRequestId } = await props.params;
  const user = await requireUser();
  const { quoteRequest, viewerRole, messages } = await getMessages(quoteRequestId);

  if (viewerRole !== "HOMEOWNER" || quoteRequest.projectId !== id) notFound();

  // Portfolio photos are only fetched here, on the individual quote's
  // detail page — never on the quotes list — so browsing several quotes
  // doesn't multiply signed-URL generation on one page load.
  const photos = await prisma.professionalPortfolioPhoto.findMany({
    where: { professionalId: quoteRequest.professional.id },
    orderBy: { uploadOrder: "asc" },
  });
  const photoUrls = await Promise.all(photos.map((p) => getSignedPhotoUrl(p.storagePath)));

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-6 py-16 text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />

      <div className="relative flex w-full max-w-2xl flex-col gap-6">
        <div>
          <Link href={`/projects/${id}/quotes`} className="text-sm text-zinc-600 underline">
            ← Quotes
          </Link>
          <h1 className="mt-2 flex items-center gap-1.5 text-2xl font-semibold">
            {quoteRequest.professional.businessName}
            {quoteRequest.professional.verificationStatus === VerificationStatus.VERIFIED && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">✓ Verified</span>
            )}
          </h1>
          {quoteRequest.professional.description && (
            <p className="mt-1 text-sm text-zinc-600">{quoteRequest.professional.description}</p>
          )}
          <p className="mt-1 text-sm text-zinc-500">
            {quoteRequest.status}
            {quoteRequest.status === QuoteRequestStatus.QUOTED && quoteRequest.quoteAmount
              ? ` — £${penceToPounds(quoteRequest.quoteAmount)}`
              : ""}
          </p>
        </div>

        {photos.length > 0 && (
          <section className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="font-medium">Their work</h2>
            <div className="grid grid-cols-3 gap-2">
              {photoUrls.map(
                (url, i) =>
                  url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={photos[i].id} src={url} alt="Past work" className="aspect-square rounded-lg object-cover" />
                  )
              )}
            </div>
          </section>
        )}

        <MessageThread
          quoteRequestId={quoteRequestId}
          messages={messages}
          currentUserId={user.id}
          disabled={quoteRequest.status === QuoteRequestStatus.DECLINED}
        />
      </div>
    </div>
  );
}
