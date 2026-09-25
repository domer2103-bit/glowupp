import Link from "next/link";
import { getProject } from "@/lib/data/projects";
import { getSignedPhotoUrl } from "@/lib/storage";
import { getProjectTypeDefinition } from "@/lib/project-types";
import { penceToPounds } from "@/lib/money";
import { deleteProjectPhoto } from "@/lib/actions/photos";
import { isAtOrPastStatus } from "@/lib/project-status";
import { ProjectStatus } from "@/generated/prisma/client";
import { RequirementsForm } from "./RequirementsForm";
import { PhotoUploadForm } from "./PhotoUploadForm";
import { StatusForm } from "./StatusForm";
import { GenerateBatchButton } from "./GenerateBatchButton";
import { ConceptCard } from "./ConceptCard";
import { PushToMarketButton } from "./PushToMarketButton";

export default async function ProjectPage(props: PageProps<"/projects/[id]">) {
  const { id } = await props.params;
  const project = await getProject(id);

  const definition = getProjectTypeDefinition(project.projectType);
  const existingRequirements = (project.requirements?.data as Record<string, unknown>) ?? {};

  const photosWithUrls = await Promise.all(
    project.photos.map(async (photo) => ({
      ...photo,
      url: await getSignedPhotoUrl(photo.storagePath),
    }))
  );

  const conceptsWithUrls = await Promise.all(
    project.designConcepts.map(async (concept) => ({
      ...concept,
      url: concept.storagePath ? await getSignedPhotoUrl(concept.storagePath) : null,
    }))
  );

  // The marketplace only appears once there's a design worth building —
  // not as always-there navigation from the moment a project exists.
  const readyForMarketplace = isAtOrPastStatus(project.status, ProjectStatus.DESIGN_READY);
  const isOnOpenMarket = isAtOrPastStatus(project.status, ProjectStatus.REQUESTING_QUOTES);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 bg-zinc-50 px-6 py-16 dark:bg-black">
      <div>
        <Link href="/projects" className="text-sm text-zinc-600 underline dark:text-zinc-400">
          ← Your projects
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{project.title}</h1>
        <p className="text-sm text-zinc-500">
          {definition?.label ?? project.projectType} — {project.postcode}
          {project.budgetMin || project.budgetMax
            ? ` — £${project.budgetMin ? penceToPounds(project.budgetMin) : "?"}–£${project.budgetMax ? penceToPounds(project.budgetMax) : "?"}`
            : ""}
        </p>
        {project.description && <p className="mt-2 text-zinc-700 dark:text-zinc-300">{project.description}</p>}
        <div className="mt-3 flex gap-3">
          <Link
            href={`/projects/${project.id}/assistant`}
            className="inline-block rounded-full bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
          >
            Chat with GlowUpp assistant
          </Link>
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Status</h2>
        <StatusForm projectId={project.id} currentStatus={project.status} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Photos</h2>
        <div className="grid grid-cols-3 gap-2">
          {photosWithUrls.map((photo) => (
            <div key={photo.id} className="flex flex-col gap-1">
              {photo.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url} alt={photo.photoType} className="aspect-square rounded-lg object-cover" />
              )}
              <span className="text-xs text-zinc-500">{photo.photoType}</span>
              <GenerateBatchButton projectId={project.id} photoId={photo.id} />
              <form action={deleteProjectPhoto.bind(null, photo.id)}>
                <button type="submit" className="text-xs text-red-600 underline">
                  Delete
                </button>
              </form>
            </div>
          ))}
        </div>
        <PhotoUploadForm projectId={project.id} />
      </section>

      {conceptsWithUrls.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Design concepts</h2>
          <div className="grid grid-cols-2 gap-3">
            {conceptsWithUrls.map((concept) => (
              <ConceptCard key={concept.id} projectId={project.id} concept={concept} url={concept.url} />
            ))}
          </div>
        </section>
      )}

      {readyForMarketplace && (
        <section className="flex flex-col gap-2 rounded-lg border border-black bg-white p-4 dark:border-white dark:bg-zinc-950">
          {isOnOpenMarket ? (
            <>
              <h2 className="font-medium">Live on the open market</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Local professionals who match this project can see it and send quotes. You&apos;ll get an email as they come
                in.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-medium">Love this design?</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Save it and push it to the open market to get quotes from local pros — entirely your choice, no pressure, and
                nothing happens until you do this.
              </p>
            </>
          )}
          <div className="flex gap-3">
            {!isOnOpenMarket && <PushToMarketButton projectId={project.id} />}
            <Link
              href={`/projects/${project.id}/quotes`}
              className="inline-block rounded-full border border-black px-4 py-2 text-sm dark:border-white"
            >
              View your quotes
            </Link>
          </div>
        </section>
      )}

      {definition && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Requirements</h2>
          <RequirementsForm projectId={project.id} definition={definition} existingData={existingRequirements} />
        </section>
      )}
    </div>
  );
}
