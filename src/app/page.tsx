import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { HOMEPAGE_CATEGORIES } from "@/lib/homepage-categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { UserRole } from "@/generated/prisma/client";

function BeforeAfterPlaceholder({ label }: { label?: string }) {
  return (
    <div className="relative flex aspect-[16/10] w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex flex-1 items-center justify-center bg-zinc-100 dark:bg-zinc-900">
        <span className="rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-white">Before</span>
      </div>
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-950 dark:to-zinc-900">
        <span className="rounded-full bg-blue-700 px-2 py-0.5 text-xs font-medium text-white">After</span>
      </div>
      {label && (
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] text-zinc-600 shadow dark:bg-black/80 dark:text-zinc-300">
          {label}
        </span>
      )}
    </div>
  );
}

export default async function Home() {
  const user = await getCurrentUser();
  const isHomeowner = user?.role === UserRole.HOMEOWNER;

  return (
    <div className="flex flex-1 flex-col bg-gradient-to-b from-blue-50 to-white dark:from-zinc-950 dark:to-black">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
          <CategoryIcon type="exterior" className="h-6 w-6 text-blue-700 dark:text-blue-400" />
          GlowUpp
        </div>
        <nav className="hidden gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400 sm:flex">
          <Link href="/" className="text-zinc-900 dark:text-zinc-50">Home</Link>
          {user ? (
            <Link href="/projects">My Projects</Link>
          ) : (
            <Link href="/signup">How It Works</Link>
          )}
        </nav>
        {user ? (
          <Link href="/dashboard" className="rounded-full border border-black px-4 py-2 text-sm dark:border-white">
            Dashboard
          </Link>
        ) : (
          <div className="flex gap-2">
            <Link href="/login" className="rounded-full border border-black px-4 py-2 text-sm dark:border-white">
              Log in
            </Link>
            <Link href="/signup" className="rounded-full bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black">
              Sign up
            </Link>
          </div>
        )}
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 sm:grid-cols-2 sm:items-center">
        <div className="flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">AI Home Redesign</span>
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 sm:text-5xl">
            Upload. Reimagine. <span className="text-blue-700 dark:text-blue-400">See Your New Space.</span>
          </h1>
          <p className="max-w-md text-zinc-600 dark:text-zinc-400">
            Turn your photos into stunning new designs with AI. Upload a picture of your space and get a fresh look in
            seconds — no design skills needed.
          </p>
          <Link
            href={user ? (isHomeowner ? "/projects/new" : "/dashboard") : "/signup"}
            className="inline-block w-fit rounded-full bg-blue-700 px-6 py-3 text-sm font-medium text-white hover:bg-blue-800"
          >
            Upload Your Photo
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          <BeforeAfterPlaceholder />
          <p className="self-end text-xs text-zinc-500 dark:text-zinc-500">Same space. A whole new feeling.</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-12">
        <h2 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">What are you redesigning?</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HOMEPAGE_CATEGORIES.map((cat) => (
            <Link
              key={cat.key}
              href={`/redesign/${cat.key}`}
              className="group flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
            >
              <BeforeAfterPlaceholder />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                    <CategoryIcon type={cat.key} className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">{cat.displayName}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{cat.tagline}</p>
                  </div>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition group-hover:bg-blue-700 group-hover:text-white dark:bg-zinc-900">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-4 px-6 pb-16 text-center text-xs text-zinc-500 dark:text-zinc-400 sm:grid-cols-4">
        <div>
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">Powered by AI</p>
          <p>Realistic, high-quality redesigns.</p>
        </div>
        <div>
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">Easy to use</p>
          <p>Just upload and get inspired.</p>
        </div>
        <div>
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">Secure &amp; private</p>
          <p>Your photos, your designs.</p>
        </div>
        <div>
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">For every space</p>
          <p>Inside and out.</p>
        </div>
      </section>
    </div>
  );
}
