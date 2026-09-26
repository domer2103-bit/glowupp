import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { HOMEPAGE_CATEGORIES } from "@/lib/homepage-categories";
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

export default async function Home() {
  const user = await getCurrentUser();
  const isHomeowner = user?.role === UserRole.HOMEOWNER;

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-gradient-to-b from-blue-50 to-white text-zinc-900">
      {/* Soft background blobs, matching the approved design — deliberately not dark-mode aware, this marketing page always renders light. */}
      <div className="pointer-events-none absolute -top-10 -right-24 h-72 w-72 rounded-full bg-blue-100 blur-2xl" />
      <div className="pointer-events-none absolute top-40 -left-32 h-80 w-80 rounded-full bg-blue-100/70 blur-2xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-blue-50 blur-2xl" />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-bold text-zinc-900">
          <CategoryIcon type="exterior" className="h-6 w-6 text-blue-700" />
          GlowUpp
        </div>
        <nav className="hidden gap-6 text-sm font-medium text-zinc-600 sm:flex">
          <Link href="/" className="border-b-2 border-blue-700 pb-1 text-zinc-900">Home</Link>
          <Link href={user ? "/projects" : "/signup"}>My Projects</Link>
          <Link href="/signup">How It Works</Link>
          <span className="cursor-default text-zinc-400">Pricing</span>
        </nav>
        {user ? (
          <Link href="/dashboard" className="rounded-full border border-black px-4 py-2 text-sm">
            Dashboard
          </Link>
        ) : (
          <Link href="/login" className="flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-sm">
            Sign In
          </Link>
        )}
      </header>

      <section className="relative mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 sm:grid-cols-2 sm:items-center">
        <div className="flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">AI Home Redesign</span>
          <h1 className="text-4xl font-bold leading-tight text-zinc-900 sm:text-5xl">
            Upload. Reimagine. <span className="text-blue-700">See Your New Space.</span>
          </h1>
          <p className="max-w-md text-zinc-600">
            Turn your photos into stunning new designs with AI. Upload a picture of your space and get a fresh look in
            seconds — no design skills needed.
          </p>
          <Link
            href={user ? (isHomeowner ? "/projects/new" : "/dashboard") : "/signup"}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-700 px-6 py-3 text-sm font-medium text-white hover:bg-blue-800"
          >
            ↑ Upload Your Photo
          </Link>
        </div>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border-4 border-white shadow-xl shadow-blue-900/10">
            <BeforeAfterImage src="/homepage/hero.jpg" alt="Kitchen before and after AI redesign" width={1200} height={400} priority />
          </div>
          <div className="hidden w-24 shrink-0 flex-col items-start pt-1 sm:flex">
            <svg className="h-8 w-10 text-blue-900" viewBox="0 0 40 32" fill="none">
              <path d="M8 4C22 2 34 8 34 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M28 15L34 20L37 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="-mt-1 rotate-2 text-lg leading-tight text-blue-900" style={{ fontFamily: "var(--font-caveat)" }}>
              Same space. A whole new feeling.
            </p>
          </div>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-6 py-12">
        <h2 className="mb-6 text-2xl font-semibold text-zinc-900">What are you redesigning?</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HOMEPAGE_CATEGORIES.map((cat) => (
            <Link
              key={cat.key}
              href={`/redesign/${cat.key}`}
              className="group flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <div className="overflow-hidden rounded-xl">
                <BeforeAfterImage
                  src={CATEGORY_IMAGES[cat.key]}
                  alt={`${cat.displayName} before and after`}
                  width={760}
                  height={253}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                    <CategoryIcon type={cat.key} className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-zinc-900">{cat.displayName}</p>
                    <p className="text-xs text-zinc-500">{cat.tagline}</p>
                  </div>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition group-hover:bg-blue-700 group-hover:text-white">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="relative mx-auto grid w-full max-w-6xl grid-cols-2 gap-4 border-t border-zinc-200 px-6 py-8 text-center text-xs text-zinc-500 sm:grid-cols-4">
        <div>
          <p className="font-semibold text-zinc-900">Powered by AI</p>
          <p>Realistic, high-quality redesigns.</p>
        </div>
        <div>
          <p className="font-semibold text-zinc-900">Easy to use</p>
          <p>Just upload and get inspired.</p>
        </div>
        <div>
          <p className="font-semibold text-zinc-900">Secure &amp; private</p>
          <p>Your photos, your designs.</p>
        </div>
        <div>
          <p className="font-semibold text-zinc-900">For every space</p>
          <p>Inside and out.</p>
        </div>
      </section>
    </div>
  );
}
