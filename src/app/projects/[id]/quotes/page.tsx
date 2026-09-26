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
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 bg-zinc-50 px-6 py-16 dark:bg-black">
      <div>
        <Link href={`/projects/${id}`} className="text-sm text-zinc-600 underline dark:text-zinc-400">
          ← {project.title}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Quotes</h1>
      </div>

      {quoteRequests.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">
          No quotes yet.{" "}
          <Link href={`/projects/${id}`} className="underline">
            Push your project to the open market
          </Link>{" "}
          to start getting them.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {quoteRequests.map((qr) => (
            <li
              key={qr.id}
              className={`flex flex-col gap-1 rounded-lg border px-4 py-3 ${qr.selected ? "border-black dark:border-white" : "border-zinc-300 dark:border-zinc-700"}`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  {qr.professional.businessName}
                  {qr.professional.verificationStatus === "VERIFIED" && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                      ✓ Verified
                    </span>
                  )}
                </span>
                <span className="text-xs text-zinc-500">
                  {qr.status}
                  {qr.selected && <span className="ml-1 font-medium text-black dark:text-white">★ Selected</span>}
                </span>
              </div>
              {qr.message && <p className="text-sm text-zinc-600 dark:text-zinc-400">Your note: {qr.message}</p>}

              <Link href={`/projects/${id}/quotes/${qr.id}`} className="self-start text-xs underline">
                Messages
              </Link>

              {qr.status === "QUOTED" && (
                <div className="mt-2 flex flex-col gap-1 rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                  <p className="font-medium">{qr.quoteAmount ? `£${penceToPounds(qr.quoteAmount)}` : "Amount not given"}</p>
                  {qr.quoteTimeline && <p className="text-zinc-600 dark:text-zinc-400">Timeline: {qr.quoteTimeline}</p>}
                  {qr.quoteNotes && <p className="text-zinc-600 dark:text-zinc-400">{qr.quoteNotes}</p>}
                  {!qr.selected && (
                    <form action={selectProfessional.bind(null, id, qr.id)}>
                      <button type="submit" className="mt-1 self-start text-xs underline">
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
  );
}
