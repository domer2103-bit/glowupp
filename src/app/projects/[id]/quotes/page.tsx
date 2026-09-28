import Link from "next/link";
import { getProjectQuoteRequests } from "@/lib/data/quotes";
import { requireProjectOwner } from "@/lib/data/projects";
import { selectProfessional } from "@/lib/actions/quotes";
import { penceToPounds } from "@/lib/money";

export default async function ProjectQuotesPage(props: PageProps<"/projects/[id]/quotes">) {
  const { id } = await props.params;
  const project = await requireProjectOwner(id);
  const quoteRequests = await getProjectQuoteRequests(id);

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-6 py-16 text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />

      <div className="relative flex w-full max-w-2xl flex-col gap-6">
        <div>
          <Link href={`/projects/${id}`} className="text-sm text-zinc-600 underline">
            ← {project.title}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Quotes</h1>
        </div>

        {quoteRequests.length === 0 ? (
          <p className="text-zinc-600">
            No quotes yet.{" "}
            <Link href={`/projects/${id}`} className="font-medium text-[#3a6694] underline">
              Push your project to the open market
            </Link>{" "}
            to start getting them.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {quoteRequests.map((qr) => (
              <li
                key={qr.id}
                className={`flex flex-col gap-1 rounded-2xl border bg-white px-5 py-4 shadow-sm ${
                  qr.selected ? "border-[#3a6694]" : "border-zinc-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    {qr.professional.businessName}
                    {qr.professional.verificationStatus === "VERIFIED" && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">✓ Verified</span>
                    )}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {qr.status}
                    {qr.selected && <span className="ml-1 font-medium text-[#3a6694]">★ Selected</span>}
                  </span>
                </div>
                {qr.message && <p className="text-sm text-zinc-600">Your note: {qr.message}</p>}

                <Link href={`/projects/${id}/quotes/${qr.id}`} className="self-start text-xs font-medium text-[#3a6694] underline">
                  Messages
                </Link>

                {qr.status === "QUOTED" && (
                  <div className="mt-2 flex flex-col gap-1 rounded-lg border border-zinc-200 bg-blue-50 p-3 text-sm">
                    <p className="font-medium">{qr.quoteAmount ? `£${penceToPounds(qr.quoteAmount)}` : "Amount not given"}</p>
                    {qr.quoteTimeline && <p className="text-zinc-600">Timeline: {qr.quoteTimeline}</p>}
                    {qr.quoteNotes && <p className="text-zinc-600">{qr.quoteNotes}</p>}
                    {!qr.selected && (
                      <form action={selectProfessional.bind(null, id, qr.id)}>
                        <button type="submit" className="mt-1 self-start text-xs font-medium text-[#3a6694] underline">
                          Select this professional
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
