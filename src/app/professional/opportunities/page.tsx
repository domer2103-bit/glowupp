import Link from "next/link";
import { getProfessionalOpportunities } from "@/lib/data/quotes";
import { OpportunityCard } from "./OpportunityCard";

export default async function OpportunitiesPage() {
  const opportunities = await getProfessionalOpportunities();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 bg-zinc-50 px-6 py-16 dark:bg-black">
      <div>
        <Link href="/dashboard" className="text-sm text-zinc-600 underline dark:text-zinc-400">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Quote opportunities</h1>
      </div>

      {opportunities.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">No quote requests yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {opportunities.map((qr) => (
            <OpportunityCard key={qr.id} quoteRequest={qr} />
          ))}
        </div>
      )}
    </div>
  );
}
