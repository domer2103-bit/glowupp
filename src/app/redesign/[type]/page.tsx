import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getHomepageCategory } from "@/lib/homepage-categories";
import { getProjectTypeDefinition } from "@/lib/project-types";
import { CategoryIcon } from "@/components/CategoryIcon";
import { UserRole } from "@/generated/prisma/client";

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
    <div className="flex flex-1 flex-col bg-gradient-to-b from-blue-50 to-white dark:from-zinc-950 dark:to-black">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
          <CategoryIcon type="exterior" className="h-6 w-6 text-blue-700 dark:text-blue-400" />
          GlowUpp
        </Link>
        <Link href="/" className="text-sm text-zinc-600 underline dark:text-zinc-400">
          ← Back to all categories
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 sm:grid-cols-2 sm:items-center">
        <div className="flex flex-col gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
            <CategoryIcon type={category.key} className="h-6 w-6" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">{category.displayName} redesign</span>
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 sm:text-5xl">{category.tagline}</h1>
          <p className="max-w-md text-zinc-600 dark:text-zinc-400">{category.heroSubcopy}</p>
          <Link
            href={ctaHref}
            className="inline-block w-fit rounded-full bg-blue-700 px-6 py-3 text-sm font-medium text-white hover:bg-blue-800"
          >
            {ctaLabel}
          </Link>
        </div>
        <div className="relative flex aspect-[16/10] w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-1 items-center justify-center bg-zinc-100 dark:bg-zinc-900">
            <span className="rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-white">Before</span>
          </div>
          <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-950 dark:to-zinc-900">
            <span className="rounded-full bg-blue-700 px-2 py-0.5 text-xs font-medium text-white">After</span>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-16">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-50">What you can tell us about your {category.displayName.toLowerCase()}</h2>
          <ul className="grid gap-2 text-sm text-zinc-600 dark:text-zinc-400 sm:grid-cols-2">
            {definition.fields.map((field) => (
              <li key={field.key}>• {field.label}</li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-500">
            Once you&apos;re happy with your design, you can optionally push it to the open market to get quotes from local
            professionals — entirely your choice, no pressure.
          </p>
        </div>
      </section>
    </div>
  );
}
