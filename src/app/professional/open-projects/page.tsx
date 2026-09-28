import Link from "next/link";
import { getOpenMarketProjects } from "@/lib/data/quotes";
import { OpenProjectCard } from "./OpenProjectCard";

export default async function OpenProjectsPage() {
  const projects = await getOpenMarketProjects();

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-6 py-16 text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />

      <div className="relative flex w-full max-w-2xl flex-col gap-6">
        <div>
          <Link href="/dashboard" className="text-sm text-zinc-600 underline">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Open projects</h1>
          <p className="text-sm text-zinc-500">
            Projects matching your services and area that a homeowner has chosen to open up for quotes. Submit one if it&apos;s a
            fit — no invitation needed.
          </p>
        </div>

        {projects.length === 0 ? (
          <p className="text-zinc-600">No open projects matching your profile right now — check back soon.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {projects.map((project) => (
              <OpenProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}

        <Link href="/professional/opportunities" className="text-sm font-medium text-[#3a6694] underline">
          View your submitted quotes →
        </Link>
      </div>
    </div>
  );
}
