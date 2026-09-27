import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getHomepageCategory } from "@/lib/homepage-categories";
import { getProjectTypeDefinition } from "@/lib/project-types";
import { getOrCreateDraftProject } from "@/lib/data/projects";
import { getSignedPhotoUrl } from "@/lib/storage";
import { penceToPounds } from "@/lib/money";
import { CategoryIcon } from "@/components/CategoryIcon";
import { BeforeAfterImage } from "@/components/BeforeAfterImage";
import { UserRole } from "@/generated/prisma/client";
import { RedesignWizard, type ChangeOption } from "./RedesignWizard";

const CATEGORY_IMAGES: Record<string, string> = {
  kitchen: "/homepage/kitchen.jpg",
  bathroom: "/homepage/bathroom.jpg",
  driveway: "/homepage/driveway.jpg",
  garden: "/homepage/garden.jpg",
  patio: "/homepage/patio.jpg",
  exterior: "/homepage/exterior.jpg",
  painting: "/homepage/painting.jpg",
  roofing: "/homepage/roofing.jpg",
  flooring: "/homepage/flooring.jpg",
  "living-room": "/homepage/living-room.jpg",
  bedroom: "/homepage/bedroom.jpg",
  "kids-room": "/homepage/kids-room.jpg",
  extension: "/homepage/extension.jpg",
};

/** Category types that have graduated from the marketing landing page to the guided, fully-functional wizard below. Extended one category at a time as each is reviewed and approved. */
const WIZARD_ENABLED_TYPES = new Set([
  "kitchen",
  "bathroom",
  "driveway",
  "garden",
  "patio",
  "exterior",
  "painting",
  "roofing",
  "flooring",
  "living-room",
  "bedroom",
  "kids-room",
  "extension",
]);

/** The wizard's "what would you like to change" chips, tailored per category to that type's own field registry (src/lib/project-types.ts). */
const CHANGE_OPTIONS_BY_TYPE: Record<string, ChangeOption[]> = {
  kitchen: [
    { key: "complete_redesign", label: "Complete redesign" },
    { key: "cabinets", label: "Cabinets" },
    { key: "worktops", label: "Worktops" },
    { key: "flooring", label: "Flooring" },
    { key: "lighting", label: "Lighting" },
    { key: "colours", label: "Colours" },
    { key: "layout", label: "Layout" },
    { key: "storage", label: "Storage" },
    { key: "appliances", label: "Appliances" },
    { key: "other", label: "Other" },
  ],
  bathroom: [
    { key: "complete_redesign", label: "Complete redesign" },
    { key: "bath_shower", label: "Bath / shower" },
    { key: "vanity", label: "Vanity" },
    { key: "toilet", label: "Toilet" },
    { key: "tiles", label: "Tiles" },
    { key: "storage", label: "Storage" },
    { key: "lighting", label: "Lighting" },
    { key: "colours", label: "Colours" },
    { key: "other", label: "Other" },
  ],
  driveway: [
    { key: "complete_redesign", label: "Complete redesign" },
    { key: "surface", label: "Surface" },
    { key: "colour", label: "Colour" },
    { key: "edging", label: "Edging" },
    { key: "drainage", label: "Drainage" },
    { key: "gates", label: "Gates" },
    { key: "other", label: "Other" },
  ],
  garden: [
    { key: "complete_redesign", label: "Complete redesign" },
    { key: "lawn", label: "Lawn" },
    { key: "planting", label: "Planting" },
    { key: "fencing", label: "Fencing" },
    { key: "lighting", label: "Lighting" },
    { key: "seating", label: "Seating" },
    { key: "storage", label: "Storage" },
    { key: "patio", label: "Patio" },
    { key: "other", label: "Other" },
  ],
  patio: [
    { key: "complete_redesign", label: "Complete redesign" },
    { key: "surface", label: "Surface" },
    { key: "seating", label: "Seating" },
    { key: "lighting", label: "Lighting" },
    { key: "drainage", label: "Drainage" },
    { key: "size", label: "Size" },
    { key: "other", label: "Other" },
  ],
  exterior: [
    { key: "complete_redesign", label: "Complete redesign" },
    { key: "finish", label: "Finish" },
    { key: "front_door", label: "Front door" },
    { key: "windows", label: "Windows" },
    { key: "lighting", label: "Lighting" },
    { key: "planting", label: "Planting" },
    { key: "other", label: "Other" },
  ],
  painting: [
    { key: "complete_redesign", label: "Complete redesign" },
    { key: "colour", label: "Colour" },
    { key: "feature_wall", label: "Feature wall" },
    { key: "ceiling", label: "Ceiling" },
    { key: "trim", label: "Trim" },
    { key: "other", label: "Other" },
  ],
  roofing: [
    { key: "complete_redesign", label: "Complete redesign" },
    { key: "material", label: "Material" },
    { key: "colour", label: "Colour" },
    { key: "guttering", label: "Guttering" },
    { key: "chimney", label: "Chimney" },
    { key: "skylights", label: "Skylights" },
    { key: "other", label: "Other" },
  ],
  flooring: [
    { key: "complete_redesign", label: "Complete redesign" },
    { key: "material", label: "Material" },
    { key: "colour", label: "Colour" },
    { key: "pattern", label: "Pattern" },
    { key: "underfloor_heating", label: "Underfloor heating" },
    { key: "other", label: "Other" },
  ],
  "living-room": [
    { key: "complete_redesign", label: "Complete redesign" },
    { key: "seating", label: "Seating" },
    { key: "storage", label: "Storage" },
    { key: "lighting", label: "Lighting" },
    { key: "flooring", label: "Flooring" },
    { key: "colours", label: "Colours" },
    { key: "layout", label: "Layout" },
    { key: "other", label: "Other" },
  ],
  bedroom: [
    { key: "complete_redesign", label: "Complete redesign" },
    { key: "bed", label: "Bed" },
    { key: "storage", label: "Storage" },
    { key: "lighting", label: "Lighting" },
    { key: "flooring", label: "Flooring" },
    { key: "colours", label: "Colours" },
    { key: "other", label: "Other" },
  ],
  "kids-room": [
    { key: "complete_redesign", label: "Complete redesign" },
    { key: "bed", label: "Bed" },
    { key: "storage", label: "Storage" },
    { key: "theme", label: "Theme" },
    { key: "lighting", label: "Lighting" },
    { key: "colours", label: "Colours" },
    { key: "other", label: "Other" },
  ],
  extension: [
    { key: "complete_redesign", label: "Complete redesign" },
    { key: "windows", label: "Windows" },
    { key: "doors", label: "Doors" },
    { key: "roofline", label: "Roofline" },
    { key: "materials", label: "Materials" },
    { key: "other", label: "Other" },
  ],
};

function budgetToPreset(budgetMin: number | null, budgetMax: number | null): string {
  if (!budgetMin && !budgetMax) return "";
  const min = budgetMin ? penceToPounds(budgetMin) : 0;
  const max = budgetMax ? penceToPounds(budgetMax) : Infinity;
  if (max <= 5000) return "under_5000";
  if (min >= 5000 && max <= 10000) return "5000_10000";
  if (min >= 10000 && max <= 20000) return "10000_20000";
  if (min >= 20000) return "over_20000";
  return "";
}

export default async function RedesignCategoryPage(props: PageProps<"/redesign/[type]">) {
  const { type } = await props.params;
  const category = getHomepageCategory(type);
  const definition = getProjectTypeDefinition(type);
  if (!category || !definition) notFound();

  const user = await getCurrentUser();
  const isHomeowner = user?.role === UserRole.HOMEOWNER;
  const showWizard = isHomeowner && WIZARD_ENABLED_TYPES.has(type);

  const ctaHref = !user ? `/signup?type=${type}` : isHomeowner ? `/projects/new?type=${type}` : "/dashboard";
  const ctaLabel = !user ? "Sign up to get started" : isHomeowner ? `Start my ${category.displayName.toLowerCase()} project` : "Go to dashboard";

  let wizardProps: {
    projectId: string;
    photos: { id: string; url: string | null }[];
    initialStyle: string;
    initialChanges: string[];
    initialColours: string[];
    initialNotes: string;
    initialBudgetPreset: string;
    categoryLabel: string;
    changeOptions: ChangeOption[];
  } | null = null;

  if (showWizard && user) {
    const project = await getOrCreateDraftProject(user.id, type, `${category.displayName} redesign`);
    const photos = await Promise.all(project.photos.map(async (p) => ({ id: p.id, url: await getSignedPhotoUrl(p.storagePath) })));
    const data = (project.requirements?.data as Record<string, unknown>) ?? {};
    wizardProps = {
      projectId: project.id,
      photos,
      initialStyle: typeof data.desiredStyle === "string" ? data.desiredStyle : "",
      initialChanges: Array.isArray(data.changesWanted) ? (data.changesWanted as string[]) : [],
      initialColours: Array.isArray(data.coloursPreference) ? (data.coloursPreference as string[]) : [],
      initialNotes: typeof data.mustHaveFeatures === "string" ? data.mustHaveFeatures : "",
      initialBudgetPreset: budgetToPreset(project.budgetMin, project.budgetMax),
      categoryLabel: category.displayName,
      changeOptions: CHANGE_OPTIONS_BY_TYPE[type] ?? [],
    };
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-gradient-to-b from-blue-50 to-white text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-200/60 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -left-32 h-96 w-96 rounded-full bg-blue-200/50 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-10 h-72 w-72 rounded-full bg-blue-100/70 blur-3xl" />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-[#132a4d]">
          <CategoryIcon type="exterior" className="h-6 w-6 text-[#3a6694]" />
          GlowUpp
        </Link>
        {wizardProps ? (
          <>
            <nav className="hidden gap-6 text-sm font-medium text-zinc-600 sm:flex">
              <Link href="/" className="border-b-2 border-[#3a6694] pb-1 text-[#132a4d]">Home</Link>
              <Link href="/projects">My Projects</Link>
              <Link href="/signup">How It Works</Link>
              <span className="cursor-default text-zinc-400">Pricing</span>
            </nav>
            <Link href={`/projects/${wizardProps.projectId}`} className="text-sm font-medium text-[#132a4d] underline">
              Save &amp; Exit
            </Link>
          </>
        ) : (
          <Link href="/" className="text-sm text-zinc-600 underline">
            ← Back to all categories
          </Link>
        )}
      </header>

      {wizardProps ? (
        <section className="relative mx-auto w-full max-w-6xl px-6 pb-16">
          <RedesignWizard redesignPath={`/redesign/${type}`} {...wizardProps} />
        </section>
      ) : (
        <>
          <section className="relative mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 sm:grid-cols-2 sm:items-center">
            <div className="flex flex-col gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#3a6694]">
                <CategoryIcon type={category.key} className="h-6 w-6" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{category.displayName} redesign</span>
              <h1 className="text-4xl font-bold text-[#132a4d] sm:text-5xl">{category.tagline}</h1>
              <p className="max-w-md text-zinc-600">{category.heroSubcopy}</p>
              <Link
                href={ctaHref}
                className="inline-block w-fit rounded-full bg-[#3a6694] px-6 py-3 text-sm font-medium text-white hover:bg-[#2c5075]"
              >
                {ctaLabel}
              </Link>
            </div>
            <div className="overflow-hidden rounded-2xl border-4 border-white shadow-xl shadow-blue-900/10">
              <BeforeAfterImage src={CATEGORY_IMAGES[category.key]} alt={`${category.displayName} before and after`} width={860} height={287} priority />
            </div>
          </section>

          <section className="relative mx-auto w-full max-w-6xl px-6 pb-16">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="mb-3 font-semibold text-[#132a4d]">What you can tell us about your {category.displayName.toLowerCase()}</h2>
              <ul className="grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
                {definition.fields.map((field) => (
                  <li key={field.key}>• {field.label}</li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-zinc-500">
                Once you&apos;re happy with your design, you can optionally push it to the open market to get quotes from local
                professionals — entirely your choice, no pressure.
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
