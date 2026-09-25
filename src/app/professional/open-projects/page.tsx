import Link from "next/link";
import { getOpenMarketProjects } from "@/lib/data/quotes";
import { OpenProjectCard } from "./OpenProjectCard";

export default async function OpenProjectsPage() {
  const projects = await getOpenMarketProjects();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 bg-zinc-50 px-6 py-16 dark:bg-black">
      <div>
        <Link href="/dashboard" className="text-sm text-zinc-600 underline dark:text-zinc-400">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Open projects</h1>
        <p className="text-sm text-zinc-500">
          Projects matching your services and area that a homeowner has chosen to open up for quotes. Submit one if it&apos;s a
          fit — no invitation needed.
        </p>
      </div>

      {projects.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">No open projects matching your profile right now — check back soon.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map((project) => (
            <OpenProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <Link href="/professional/opportunities" className="text-sm underline">
        View your submitted quotes →
      </Link>
    </div>
  );
}
