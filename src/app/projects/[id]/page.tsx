import Link from "next/link";
import { getProjectForOwnerOrGuest } from "@/lib/data/projects";
import { getSignedPhotoUrl } from "@/lib/storage";
import { getProjectTypeDefinition } from "@/lib/project-types";
import { penceToPounds } from "@/lib/money";
import { deleteProjectPhoto } from "@/lib/actions/photos";
import { isAtOrPastStatus } from "@/lib/project-status";
import { ProjectStatus } from "@/generated/prisma/client";
import { CategoryIcon } from "@/components/CategoryIcon";
import { RequirementsForm } from "./RequirementsForm";
import { PhotoUploadForm } from "./PhotoUploadForm";
import { StatusForm } from "./StatusForm";
import { GenerateBatchButton } from "./GenerateBatchButton";
import { ConceptCard } from "./ConceptCard";
import { PushToMarketButton } from "./PushToMarketButton";

export default async function ProjectPage(props: PageProps<"/projects/[id]">) {
  const { id } = await props.params;
  const { project, isGuest } = await getProjectForOwnerOrGuest(id);

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
    <div className="relative flex flex-1 flex-col overflow-hidden bg-gradient-to-b from-blue-50 to-white text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-200/60 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -left-32 h-96 w-96 rounded-full bg-blue-200/50 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-10 h-72 w-72 rounded-full bg-blue-100/70 blur-3xl" />

      <header className="relative mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-[#132a4d]">
          <CategoryIcon type="exterior" className="h-6 w-6 text-[#3a6694]" />
          GlowUpp
        </Link>
        <Link href="/projects" className="text-sm font-medium text-[#132a4d] underline">
          ← Your projects
        </Link>
      </header>

      <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 pb-20">
        <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#3a6694]">
                <CategoryIcon type={project.projectType} className="h-3.5 w-3.5" />
                {definition?.label ?? project.projectType}
              </span>
              <h1 className="mt-3 text-3xl font-bold text-[#132a4d]">{project.title}</h1>
              <p className="mt-1 text-sm text-zinc-500">
                {project.postcode || "Postcode not set yet"}
                {project.budgetMin || project.budgetMax
                  ? ` · £${project.budgetMin ? penceToPounds(project.budgetMin) : "?"}–£${project.budgetMax ? penceToPounds(project.budgetMax) : "?"}`
                  : ""}
              </p>
              {project.description && <p className="mt-3 max-w-lg text-sm text-zinc-600">{project.description}</p>}
            </div>
            <Link
              href={`/projects/${project.id}/assistant`}
              className="inline-block shrink-0 rounded-full bg-[#3a6694] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2c5075]"
            >
              Chat with GlowUpp assistant
            </Link>
          </div>

          <div className="mt-6 border-t border-zinc-100 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Status</p>
            <StatusForm projectId={project.id} currentStatus={project.status} />
          </div>
        </section>

        <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-bold text-[#132a4d]">Photos</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {photosWithUrls.map((photo) => (
              <div key={photo.id} className="flex w-32 flex-col gap-2">
                {photo.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.url} alt={photo.photoType} className="aspect-square rounded-xl border border-zinc-200 object-cover" />
                )}
                <span className="text-center text-xs text-zinc-500">{photo.photoType}</span>
                <GenerateBatchButton projectId={project.id} photoId={photo.id} />
                <form action={deleteProjectPhoto.bind(null, photo.id)}>
                  <button type="submit" className="w-full text-center text-xs text-red-600 underline">
                    Delete
                  </button>
                </form>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-zinc-100 pt-4">
            <PhotoUploadForm projectId={project.id} />
          </div>
        </section>

        {conceptsWithUrls.length > 0 && (
          <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-[#132a4d]">Design concepts</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {conceptsWithUrls.map((concept) => (
                <ConceptCard key={concept.id} projectId={project.id} concept={concept} url={concept.url} isGuest={isGuest} />
              ))}
            </div>
          </section>
        )}

        {readyForMarketplace && (
          <section className="rounded-[28px] border border-[#3a6694]/30 bg-blue-50/60 p-6 shadow-sm sm:p-8">
            {isOnOpenMarket ? (
              <>
                <h2 className="text-lg font-bold text-[#132a4d]">Live on the open market</h2>
                <p className="mt-2 text-sm text-zinc-600">
                  Local professionals who match this project can see it and send quotes. You&apos;ll get an email as they come
                  in.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-[#132a4d]">Love this design?</h2>
                <p className="mt-2 text-sm text-zinc-600">
                  Save it and push it to the open market to get quotes from local pros — entirely your choice, no pressure,
                  and nothing happens until you do this.
                </p>
              </>
            )}
            {isGuest ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  href={`/signup?next=${encodeURIComponent(`/projects/${project.id}`)}`}
                  className="inline-flex items-center rounded-full bg-[#3a6694] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2c5075]"
                >
                  Sign in to find a professional
                </Link>
                <span className="text-xs text-zinc-500">Your design is saved — signing in takes a second and won&apos;t lose it.</span>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-3">
                {!isOnOpenMarket && <PushToMarketButton projectId={project.id} />}
                <Link
                  href={`/projects/${project.id}/quotes`}
                  className="inline-flex items-center rounded-full border border-[#3a6694] px-4 py-2 text-sm font-medium text-[#3a6694] transition hover:bg-white"
                >
                  View your quotes
                </Link>
              </div>
            )}
          </section>
        )}

        {definition && (
          <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-[#132a4d]">Requirements</h2>
            <p className="mt-1 text-sm text-zinc-500">The full brief GlowUpp uses to generate and refine your designs.</p>
            <div className="mt-4">
              <RequirementsForm projectId={project.id} definition={definition} existingData={existingRequirements} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
