import Link from "next/link";

/** Replaces Next's default 404, which is a plain black screen on a phone in dark mode. */
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-[#132a4d]">We can&apos;t find that page</h1>
      <p className="text-sm text-zinc-600">
        The link may be out of date, or this project may belong to a different device or account. If you were in the middle of a design, sign in to find it again.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/projects" className="rounded-full bg-[#3a6694] px-6 py-3 text-sm font-medium text-white hover:bg-[#2c5075]">
          My projects
        </Link>
        <Link href="/" className="rounded-full border border-[#3a6694] px-6 py-3 text-sm font-medium text-[#3a6694] hover:bg-blue-50">
          Home
        </Link>
      </div>
    </main>
  );
}
