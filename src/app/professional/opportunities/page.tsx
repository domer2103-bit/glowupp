import Link from "next/link";
import { getProfessionalQuotes } from "@/lib/data/quotes";
import { OpportunityCard } from "./OpportunityCard";

export default async function OpportunitiesPage() {
  const quotes = await getProfessionalQuotes();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 bg-zinc-50 px-6 py-16 dark:bg-black">
      <div>
        <Link href="/dashboard" className="text-sm text-zinc-600 underline dark:text-zinc-400">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Your quotes</h1>
        <p className="text-sm text-zinc-500">
          Quotes you&apos;ve sent. Looking for new projects?{" "}
          <Link href="/professional/open-projects" className="underline">
            Browse the open market
          </Link>
          .
        </p>
      </div>

      {quotes.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">
          No quotes sent yet.{" "}
          <Link href="/professional/open-projects" className="underline">
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
  );
}
