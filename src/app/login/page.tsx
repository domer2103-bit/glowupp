import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const confirmed = params.confirmed === "1";
  const projectType = typeof params.type === "string" ? params.type : undefined;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 py-16 dark:bg-black">
      <h1 className="text-2xl font-semibold">Log in to GlowUpp</h1>
      {confirmed && (
        <p className="rounded-lg border border-black bg-white px-4 py-2 text-sm dark:border-white dark:bg-zinc-950">
          Email confirmed — you can log in now.
        </p>
      )}
      <LoginForm projectType={projectType} />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
