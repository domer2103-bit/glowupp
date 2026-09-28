import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMessages } from "@/lib/data/messages";
import { penceToPounds } from "@/lib/money";
import { MessageThread } from "@/components/MessageThread";
import { QuoteRequestStatus } from "@/generated/prisma/client";

export default async function OpportunityThreadPage(props: PageProps<"/professional/opportunities/[quoteRequestId]">) {
  const { quoteRequestId } = await props.params;
  const user = await requireUser();
  const { quoteRequest, viewerRole, messages } = await getMessages(quoteRequestId);

  if (viewerRole !== "PROFESSIONAL") notFound();

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-6 py-16 text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />

      <div className="relative flex w-full max-w-2xl flex-col gap-6">
        <div>
          <Link href="/professional/opportunities" className="text-sm text-zinc-600 underline">
            ← Quote opportunities
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{quoteRequest.project.title}</h1>
          <p className="text-sm text-zinc-500">
            {quoteRequest.status}
            {quoteRequest.status === QuoteRequestStatus.QUOTED && quoteRequest.quoteAmount
              ? ` — £${penceToPounds(quoteRequest.quoteAmount)}`
              : ""}
          </p>
        </div>

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
