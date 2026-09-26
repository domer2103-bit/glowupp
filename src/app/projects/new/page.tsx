import { requireRole } from "@/lib/auth";
import { UserRole } from "@/generated/prisma/client";
import { NewProjectForm } from "./NewProjectForm";

export default async function NewProjectPage(props: PageProps<"/projects/new">) {
  await requireRole(UserRole.HOMEOWNER);
  const params = await props.searchParams;
  const initialType = typeof params.type === "string" ? params.type : undefined;

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-zinc-50 px-6 py-16 dark:bg-black">
      <h1 className="text-2xl font-semibold">Start a new project</h1>
      <NewProjectForm initialType={initialType} />
    </div>
  );
}
