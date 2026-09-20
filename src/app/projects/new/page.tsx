import { requireRole } from "@/lib/auth";
import { UserRole } from "@/generated/prisma/client";
import { NewProjectForm } from "./NewProjectForm";

export default async function NewProjectPage() {
  await requireRole(UserRole.HOMEOWNER);

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-zinc-50 px-6 py-16 dark:bg-black">
      <h1 className="text-2xl font-semibold">Start a new project</h1>
      <NewProjectForm />
    </div>
  );
}
