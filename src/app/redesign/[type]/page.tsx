import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getHomepageCategory } from "@/lib/homepage-categories";
import { getProjectTypeDefinition } from "@/lib/project-types";
import { CategoryIcon } from "@/components/CategoryIcon";
import { BeforeAfterImage } from "@/components/BeforeAfterImage";
import { UserRole } from "@/generated/prisma/client";

const CATEGORY_IMAGES: Record<string, string> = {
  kitchen: "/homepage/kitchen.jpg",
  bathroom: "/homepage/bathroom.jpg",
  driveway: "/homepage/driveway.jpg",
  garden: "/homepage/garden.jpg",
  patio: "/homepage/patio.jpg",
  exterior: "/homepage/exterior.jpg",
};

export default async function RedesignCategoryPage(props: PageProps<"/redesign/[type]">) {
  const { type } = await props.params;
  const category = getHomepageCategory(type);
  const definition = getProjectTypeDefinition(type);
  if (!category || !definition) notFound();

  const user = await getCurrentUser();
  const isHomeowner = user?.role === UserRole.HOMEOWNER;

  const ctaHref = !user ? `/signup?type=${type}` : isHomeowner ? `/projects/new?type=${type}` : "/dashboard";
  const ctaLabel = !user ? "Sign up to get started" : isHomeowner ? `Start my ${category.displayName.toLowerCase()} project` : "Go to dashboard";

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
        <Link href="/" className="text-sm text-zinc-600 underline">
          ← Back to all categories
        </Link>
      </header>

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
    </div>
  );
}
