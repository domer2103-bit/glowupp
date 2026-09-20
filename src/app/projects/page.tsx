import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@/generated/prisma/client";
import { listHomeownerProjects } from "@/lib/data/projects";
import { getProjectTypeDefinition } from "@/lib/project-types";

export default async function ProjectsPage() {
  await requireRole(UserRole.HOMEOWNER);
  const projects = await listHomeownerProjects();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your projects</h1>
        <Link href="/projects/new" className="rounded-full bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black">
          New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">No projects yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="flex flex-col gap-1 rounded-lg border border-zinc-300 px-4 py-3 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                <span className="font-medium">{project.title}</span>
                <span className="text-sm text-zinc-500">
                  {getProjectTypeDefinition(project.projectType)?.label ?? project.projectType} — {project.postcode} — {project.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link href="/dashboard" className="text-sm text-zinc-600 underline dark:text-zinc-400">
        Back to dashboard
      </Link>
    </div>
  );
}
