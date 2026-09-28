import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@/generated/prisma/client";
import { listHomeownerProjects } from "@/lib/data/projects";
import { getProjectTypeDefinition } from "@/lib/project-types";

export default async function ProjectsPage() {
  await requireRole(UserRole.HOMEOWNER);
  const projects = await listHomeownerProjects();

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-6 py-16 text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />

      <div className="relative flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Your projects</h1>
          <Link href="/#categories" className="rounded-full bg-[#3a6694] px-4 py-2 text-sm font-medium text-white hover:bg-[#2c5075]">
            New project
          </Link>
        </div>

        {projects.length === 0 ? (
          <p className="text-zinc-600">No projects yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
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

        <Link href="/dashboard" className="text-sm text-zinc-600 underline">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
