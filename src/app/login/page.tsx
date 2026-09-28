import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const confirmed = params.confirmed === "1";
  const projectType = typeof params.type === "string" ? params.type : undefined;
  const next = typeof params.next === "string" ? params.next : undefined;

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-6 py-16 text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />
      <div className="pointer-events-none absolute bottom-0 -left-20 h-96 w-96 rounded-full bg-blue-300/35 blur-2xl" />

      <div className="relative flex w-full max-w-sm flex-col gap-6 rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl shadow-blue-900/10">
        <h1 className="text-center text-2xl font-semibold">Log in to GlowUpp</h1>
        {confirmed && (
          <p className="rounded-lg border border-[#3a6694] bg-blue-50 px-4 py-2 text-center text-sm">
            Email confirmed — you can log in now.
          </p>
        )}
        <LoginForm projectType={projectType} next={next} />
        <p className="text-center text-sm text-zinc-600">
          Don&apos;t have an account?{" "}
          <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className="font-medium text-[#3a6694] underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
