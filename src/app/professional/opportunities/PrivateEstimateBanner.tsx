import Link from "next/link";
import { privateLeadHref } from "@/lib/pipeline-links";

/**
 * Shown to a contractor whose private client has asked for an estimate that
 * hasn't been sent yet. The quote is sent from the Private leads tab, not from
 * the message thread — this is the way from one to the other.
 */
export function PrivateEstimateBanner({ sessionId }: { sessionId?: string | null }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#3a6694]/30 bg-blue-50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-[#132a4d]">This client has asked you for an estimate</p>
        <p className="mt-0.5 text-sm text-zinc-600">Send your itemised quote from your Private leads. Messages here are chat only — they don&apos;t send a price.</p>
      </div>
      <Link
        href={privateLeadHref(sessionId)}
        className="shrink-0 rounded-full bg-[#3a6694] px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-[#2c5075]"
      >
        Send your quote →
      </Link>
    </div>
  );
}
