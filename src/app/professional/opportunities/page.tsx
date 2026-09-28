import Link from "next/link";
import { getProfessionalQuotes } from "@/lib/data/quotes";
import { OpportunityCard } from "./OpportunityCard";

export default async function OpportunitiesPage() {
  const quotes = await getProfessionalQuotes();

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-6 py-16 text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />

      <div className="relative flex w-full max-w-2xl flex-col gap-6">
        <div>
          <Link href="/dashboard" className="text-sm text-zinc-600 underline">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Your quotes</h1>
          <p className="text-sm text-zinc-500">
            Quotes you&apos;ve sent. Looking for new projects?{" "}
            <Link href="/professional/open-projects" className="font-medium text-[#3a6694] underline">
              Browse the open market
            </Link>
            .
          </p>
        </div>

        {quotes.length === 0 ? (
          <p className="text-zinc-600">
            No quotes sent yet.{" "}
            <Link href="/professional/open-projects" className="font-medium text-[#3a6694] underline">
              Browse open projects
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {quotes.map((qr) => (
              <OpportunityCard key={qr.id} quoteRequest={qr} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
