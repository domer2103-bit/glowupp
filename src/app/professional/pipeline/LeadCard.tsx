import Link from "next/link";
import { getProjectTypeDefinition } from "@/lib/project-types";
import { markDepositReceived } from "@/lib/actions/private-pipeline";
import { penceToPounds } from "@/lib/money";
import { readLineItems } from "@/lib/pipeline-quote";
import type { PrivateLead } from "@/lib/data/private-pipeline";
import { PrivateQuoteForm } from "./PrivateQuoteForm";
import { privateLeadAnchorId } from "@/lib/pipeline-links";

export function LeadCard({ lead }: { lead: PrivateLead }) {
  const qr = lead.quoteRequest;
  const typeLabel = getProjectTypeDefinition(lead.projectType)?.label ?? lead.projectType;
  const quoted = qr?.status === "QUOTED";

  return (
    <li id={privateLeadAnchorId(lead.sessionId)} className="flex scroll-mt-24 flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{lead.clientLabel}</p>
          <p className="text-sm text-zinc-500">
            {typeLabel}
            {lead.postcode ? ` · ${lead.postcode}` : ""} · started {lead.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-[#3a6694]">
          {qr?.selected ? "Client accepted ★" : quoted ? "Quote sent" : lead.estimateRequestedAt ? "Estimate requested" : "Designing"}
        </span>
      </div>

      {lead.renders.length === 0 ? (
        <p className="text-sm text-zinc-500">No renders yet — they&apos;ll appear here as soon as the client generates one.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {lead.renders.map((r) =>
            r.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={r.id} src={r.url} alt={`Render v${r.version}`} className={`aspect-[4/3] w-full rounded-lg border object-cover ${r.selected ? "border-[#3a6694] ring-2 ring-[#3a6694]/40" : "border-zinc-200"}`} />
            ) : null
          )}
        </div>
      )}

      {!lead.estimateRequestedAt || !qr ? (
        <p className="text-sm text-zinc-500">You can send an itemised quote as soon as the client presses &ldquo;Send render &amp; request official estimate&rdquo;.</p>
      ) : (
        <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4">
          {quoted && qr.quoteAmount && (
            <div className="text-sm">
              <p className="font-medium">
                Your quote: £{penceToPounds(qr.quoteAmount).toFixed(2)} ({readLineItems(qr.quoteLineItems).length} items)
              </p>
              {qr.depositAmount && (
                <div className="text-zinc-600">
                  Deposit requested: £{penceToPounds(qr.depositAmount).toFixed(2)} —{" "}
                  {qr.depositReceivedAt ? (
                    <span className="font-medium text-emerald-700">received ✓</span>
                  ) : (
                    <form action={markDepositReceived.bind(null, qr.id)} className="inline">
                      <button type="submit" className="font-medium text-[#3a6694] underline">
                        Mark as received
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {!qr.selected && (
            <details open={!quoted}>
              <summary className="cursor-pointer text-sm font-medium text-[#3a6694]">{quoted ? "Revise quote" : "Send itemised quote"}</summary>
              <div className="mt-3">
                <PrivateQuoteForm
                  sessionId={lead.sessionId}
                  initialItems={readLineItems(qr.quoteLineItems)}
                  initialTimeline={qr.quoteTimeline ?? ""}
                  initialNotes={qr.quoteNotes ?? ""}
                  initialDepositPence={qr.depositAmount}
                  alreadyQuoted={quoted}
                />
              </div>
            </details>
          )}

          <Link href={`/professional/opportunities/${qr.id}`} className="self-start text-sm font-medium text-[#3a6694] underline">
            Message the client
          </Link>
        </div>
      )}
    </li>
  );
}
