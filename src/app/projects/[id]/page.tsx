import Link from "next/link";
import { getProjectForOwnerOrGuest } from "@/lib/data/projects";
import { getSignedPhotoUrl } from "@/lib/storage";
import { getProjectTypeDefinition } from "@/lib/project-types";
import { deleteProjectPhoto } from "@/lib/actions/photos";
import { selectDesignConcept } from "@/lib/actions/designs";
import { isAtOrPastStatus } from "@/lib/project-status";
import { ProjectStatus } from "@/generated/prisma/client";
import { CategoryIcon } from "@/components/CategoryIcon";
import { AutoRefresh } from "@/components/AutoRefresh";
import { PhotoUploadForm } from "./PhotoUploadForm";
import { GenerateBatchButton } from "./GenerateBatchButton";
import { GenerateRestButton } from "./GenerateRestButton";
import { MoreStylesButton } from "./MoreStylesButton";
import { StyleOptionCard } from "./StyleOptionCard";
import { PushToMarketButton } from "./PushToMarketButton";
import { SendPrivateEstimateButton } from "./SendPrivateEstimateButton";
import { AssistantChat, OpenAssistantButton } from "./AssistantChat";
import { chosenDesignGroup, getChosenConcept, photosNeedingDesign, styleOptions } from "@/lib/design-selection";
import { DESIGN_STYLES, getDesignStyle } from "@/lib/design-styles";
import { GENERATION_LIMITS } from "@/lib/generation-limits";
import { getActivePipelineForProject } from "@/lib/data/private-pipeline";
import { prisma } from "@/lib/prisma";

const CARD = "rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8";
const PRIMARY_LINK =
  "inline-flex min-h-12 items-center rounded-full bg-[#3a6694] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2c5075]";

export default async function ProjectPage(props: PageProps<"/projects/[id]">) {
  const { id } = await props.params;
  // ?styles=all brings back the style options after the homeowner has chosen one, to compare or switch.
  const showAllStyles = (await props.searchParams).styles === "all";
  const { project, isGuest } = await getProjectForOwnerOrGuest(id);

  const definition = getProjectTypeDefinition(project.projectType);
  const categoryLabel = (definition?.label ?? project.projectType).toLowerCase();

  const sign = async <T extends { storagePath: string | null }>(rows: T[]) =>
    Promise.all(rows.map(async (row) => ({ ...row, url: row.storagePath ? await getSignedPhotoUrl(row.storagePath) : null })));
  const photos = await sign(project.photos);
  const concepts = await sign(project.designConcepts);

  // Generation runs in the background, so keep the page fresh while any image is still being made.
  const generatingNow = concepts.some((c) => c.status === "PENDING" || c.status === "PROCESSING");
  const chosen = getChosenConcept(concepts);
  const stage = chosen && chosen.status === "COMPLETE" && !showAllStyles ? "design" : concepts.length > 0 ? "styles" : "start";

  const header = (
    <header className="relative mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-6">
      <Link href="/" className="flex items-center gap-2 text-lg font-bold text-[#132a4d]">
        <CategoryIcon type="exterior" className="h-6 w-6 text-[#3a6694]" />
        GlowUpp
      </Link>
      <Link href="/projects" className="text-sm font-medium text-[#132a4d] underline">
        ← Your projects
      </Link>
    </header>
  );

  const shell = (children: React.ReactNode) => (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-gradient-to-b from-blue-50 to-white text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-200/60 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -left-32 h-96 w-96 rounded-full bg-blue-200/50 blur-3xl" />
      {header}
      <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 pb-20">{children}</div>
      {generatingNow && <AutoRefresh everyMs={8000} />}
    </div>
  );

  // ── Step 1: nothing generated yet (arrived without finishing the guided steps) ──────────────
  if (stage === "start") {
    return shell(
      <section className={CARD}>
        <h1 className="text-2xl font-bold">{project.title}</h1>
        <p className="mt-2 text-sm text-zinc-600">Your designs haven&apos;t been created yet. Pick up where you left off and we&apos;ll make them.</p>
        <div className="mt-5 flex flex-wrap items-start gap-3">
          <Link href={`/redesign/${project.projectType}`} className={PRIMARY_LINK}>
            Continue my redesign
          </Link>
          {photos.length > 0 && <GenerateBatchButton projectId={project.id} photoId={photos[photos.length - 1].id} />}
        </div>
      </section>
    );
  }

  // ── Step 2: choose a style — only the options, and a way to see different ones ──────────────
  if (stage === "styles") {
    const options = styleOptions(concepts);
    const madeStyles = new Set(options.map((o) => o.styleKey));
    const stylesLeft = DESIGN_STYLES.filter((s) => !madeStyles.has(s.key)).length;
    const roomLeft = GENERATION_LIMITS.maxPerProject - concepts.length;
    const canShowMore = !generatingNow && stylesLeft > 0 && roomLeft > 0;

    return shell(
      <section className={CARD}>
        {chosen && (
          <Link href={`/projects/${project.id}`} className="text-sm font-medium text-[#3a6694] underline">
            ← Back to my design
          </Link>
        )}
        <h1 className={`${chosen ? "mt-3 " : ""}text-2xl font-bold sm:text-3xl`}>{chosen ? "Choose a different style" : "Choose your style"}</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {generatingNow
            ? "We're creating your designs — it takes about two minutes. This page updates by itself."
            : `Here are some looks for your ${categoryLabel}. Pick the one you like best.`}
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {options.map((option) => (
            <StyleOptionCard
              key={option.id}
              projectId={project.id}
              concept={option}
              url={option.url}
              label={(option.styleKey ? getDesignStyle(option.styleKey)?.label : undefined) ?? option.description ?? "Your design"}
              isCurrent={!!chosen && option.styleKey !== null && option.styleKey === chosen.styleKey}
            />
          ))}
        </div>
        {canShowMore && (
          <div className="mt-6 flex justify-center">
            <MoreStylesButton projectId={project.id} />
          </div>
        )}
        {!generatingNow && !canShowMore && (
          <p className="mt-6 text-center text-sm text-zinc-500">
            {roomLeft <= 0 ? "You've reached the design limit for this project." : "You've now seen all of our style directions."}
          </p>
        )}
      </section>
    );
  }

  // ── Step 3: the chosen design ───────────────────────────────────────────────────────────────
  const design = chosen!;
  const { versions, angles } = chosenDesignGroup(concepts, design);
  const sourcePhoto = photos.find((p) => p.id === design.sourcePhotoId);
  const otherPhotos = photos.filter((p) => p.id !== design.sourcePhotoId);
  const photosToMatch = photosNeedingDesign(project.photos, project.designConcepts, design);
  const styleLabel = design.styleKey ? getDesignStyle(design.styleKey)?.label : undefined;

  const isOnOpenMarket = isAtOrPastStatus(project.status, ProjectStatus.REQUESTING_QUOTES);
  // Private Client Pipeline: a project locked to one contractor never shows the open-market option.
  const pipeline = await getActivePipelineForProject(project.id);

  // The assistant pop-up: its history, now used to ask for changes to this design.
  const assistantMessages = await prisma.assistantMessage.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "asc" }, take: 200 });

  const signInLink = (text: string) => (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <Link href={`/signup?next=${encodeURIComponent(`/projects/${project.id}`)}`} className={PRIMARY_LINK}>
        {text}
      </Link>
      <span className="text-xs text-zinc-500">Your design is saved — signing in takes a second and won&apos;t lose it.</span>
    </div>
  );

  return (
    <>
      {shell(
        <>
          <section className={CARD}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#3a6694]">
              <CategoryIcon type={project.projectType} className="h-3.5 w-3.5" />
              {definition?.label ?? project.projectType}
            </span>
            <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Your {styleLabel ? `${styleLabel.toLowerCase()} ` : ""}design</h1>

            {design.url && (
              <a href={design.url} target="_blank" rel="noopener noreferrer" className="mt-5 block" aria-label="Open your design full size">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={design.url} alt="Your chosen design" className="aspect-video w-full rounded-2xl border border-zinc-200 object-cover" />
              </a>
            )}
            {generatingNow && (
              <p role="status" className="mt-3 rounded-xl bg-blue-50 px-4 py-3 text-sm text-[#132a4d]">
                Working on your update — it takes about a minute or two. This page refreshes by itself.
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-[#3a6694]">
              {isGuest ? (
                <Link href={`/signup?next=${encodeURIComponent(`/projects/${project.id}`)}`} className="underline">
                  Sign in to download
                </Link>
              ) : (
                design.url && (
                  <a href={design.url} download className="underline">
                    Download
                  </a>
                )
              )}
              <Link href={`/projects/${project.id}?styles=all`} className="underline">
                Choose a different style
              </Link>
            </div>

            {(sourcePhoto?.url || versions.length > 0) && (
              <div className="mt-6 flex flex-wrap gap-4 border-t border-zinc-100 pt-5">
                {sourcePhoto?.url && (
                  <figure className="w-28">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sourcePhoto.url} alt="Your original photo" className="aspect-square w-full rounded-xl border border-zinc-200 object-cover" />
                    <figcaption className="mt-1 text-center text-xs text-zinc-500">Your photo</figcaption>
                  </figure>
                )}
                {versions.map((version) => (
                  <figure key={version.id} className="w-28">
                    {version.url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={version.url} alt={`Earlier version ${version.version}`} className="aspect-square w-full rounded-xl border border-zinc-200 object-cover" />
                    )}
                    <figcaption className="mt-1 text-center text-xs text-zinc-500">
                      <form action={selectDesignConcept.bind(null, project.id, version.id)}>
                        <button type="submit" className="font-medium text-[#3a6694] underline">
                          Go back to this version
                        </button>
                      </form>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </section>

          <section className={CARD}>
            <h2 className="text-lg font-bold">Want anything changed?</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Chat with our assistant and tell it what you&apos;d like different — for example &ldquo;make the worktop darker&rdquo; — and it will update your design.
            </p>
            <div className="mt-4">
              <OpenAssistantButton label="Chat with our assistant" />
            </div>
          </section>

          <section className={CARD}>
            <h2 className="text-lg font-bold">Add more angles</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Got photos of the same space from other angles? Add them and we&apos;ll design them in your chosen style too.
            </p>
            {otherPhotos.length > 0 && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {otherPhotos.map((photo) => {
                  const made = angles.filter((a) => a.sourcePhotoId === photo.id);
                  const finished = made.filter((a) => a.status === "COMPLETE" && a.url).at(-1);
                  const inProgress = made.some((a) => a.status === "PENDING" || a.status === "PROCESSING");
                  const hasDesigns = concepts.some((c) => c.sourcePhotoId === photo.id);
                  return (
                    <div key={photo.id} className="flex flex-col gap-2 rounded-2xl border border-zinc-200 p-3">
                      {finished?.url ? (
                        <a href={finished.url} target="_blank" rel="noopener noreferrer" aria-label="Open this design full size">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={finished.url} alt="Designed in your chosen style" className="aspect-video w-full rounded-xl object-cover" />
                        </a>
                      ) : photo.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo.url} alt="Your photo" className="aspect-video w-full rounded-xl object-cover" />
                      ) : null}
                      <p className="text-xs text-zinc-500">{finished ? "Designed in your style" : inProgress ? "Creating your design…" : "Not designed yet"}</p>
                      {!hasDesigns && (
                        <form action={deleteProjectPhoto.bind(null, photo.id)}>
                          <button type="submit" className="text-xs text-red-600 underline">
                            Remove photo
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-4">
              <PhotoUploadForm projectId={project.id} />
            </div>
            {photosToMatch.length > 0 && (
              <div className="mt-4">
                <GenerateRestButton projectId={project.id} count={photosToMatch.length} />
              </div>
            )}
          </section>

          {pipeline ? (
            <section className="rounded-[28px] border border-[#3a6694]/30 bg-blue-50/60 p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-bold">Private design portal — {pipeline.professional.businessName}</h2>
              {pipeline.estimateRequestedAt ? (
                <p className="mt-2 text-sm text-zinc-600">
                  Your render has been sent to {pipeline.professional.businessName}. They&apos;ll reply with an itemised estimate, and you can message them directly.
                </p>
              ) : (
                <p className="mt-2 text-sm text-zinc-600">
                  This design stays between you and {pipeline.professional.businessName} — it isn&apos;t shared with other tradespeople. When you&apos;re happy with it, send it over to get an official estimate.
                </p>
              )}
              {isGuest ? (
                signInLink("Sign in to request your estimate")
              ) : (
                <div className="mt-4 flex flex-wrap gap-3">
                  {!pipeline.estimateRequestedAt && <SendPrivateEstimateButton projectId={project.id} contractorName={pipeline.professional.businessName} />}
                  {pipeline.estimateRequestedAt && (
                    <Link
                      href={`/projects/${project.id}/quotes`}
                      className="inline-flex min-h-12 items-center rounded-full border border-[#3a6694] px-6 py-3 text-sm font-semibold text-[#3a6694] transition hover:bg-white"
                    >
                      View your estimate
                    </Link>
                  )}
                </div>
              )}
            </section>
          ) : (
            <section className="rounded-[28px] border border-[#3a6694]/30 bg-blue-50/60 p-6 shadow-sm sm:p-8">
              {isOnOpenMarket ? (
                <>
                  <h2 className="text-lg font-bold">Tradespeople are being asked to quote</h2>
                  <p className="mt-2 text-sm text-zinc-600">
                    Local professionals who match your project can see it and send quotes. You&apos;ll get an email as they come in.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-bold">Ready to make it happen?</h2>
                  <p className="mt-2 text-sm text-zinc-600">
                    Send your design to local tradespeople and they&apos;ll send you quotes. It&apos;s your choice — nothing is shared until you press the button.
                  </p>
                </>
              )}
              {isGuest ? (
                signInLink("Sign in to find a tradesperson")
              ) : (
                <div className="mt-4 flex flex-wrap items-end gap-4">
                  {!isOnOpenMarket && <PushToMarketButton projectId={project.id} postcode={project.postcode} />}
                  {isOnOpenMarket && (
                    <Link href={`/projects/${project.id}/quotes`} className={PRIMARY_LINK}>
                      View your quotes
                    </Link>
                  )}
                </div>
              )}
            </section>
          )}
        </>
      )}

      <AssistantChat
        projectId={project.id}
        messages={assistantMessages.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content }))}
        status={null}
        forDesign
      />
    </>
  );
}
