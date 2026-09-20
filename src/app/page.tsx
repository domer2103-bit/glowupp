import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 text-center dark:bg-black">
      <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">GlowUpp</h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Backend under construction — this page exists to exercise the auth flow, not as the
        marketing site.
      </p>
      {user ? (
        <Link href="/dashboard" className="rounded-full bg-black px-5 py-3 text-white dark:bg-white dark:text-black">
          Go to dashboard
        </Link>
      ) : (
        <div className="flex gap-4">
          <Link href="/login" className="rounded-full border border-black px-5 py-3 dark:border-white">
            Log in
          </Link>
          <Link href="/signup" className="rounded-full bg-black px-5 py-3 text-white dark:bg-white dark:text-black">
            Sign up
          </Link>
        </div>
      )}
    </div>
  );
}
