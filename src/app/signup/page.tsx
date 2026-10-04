import Link from "next/link";
import { SignupForm } from "./SignupForm";
import { getHomepageCategory } from "@/lib/homepage-categories";

export default async function SignupPage(props: PageProps<"/signup">) {
  const params = await props.searchParams;
  const typeParam = typeof params.type === "string" ? params.type : undefined;
  const category = typeParam ? getHomepageCategory(typeParam) : undefined;
  const next = typeof params.next === "string" ? params.next : undefined;
  const defaultRole = params.role === "professional" ? "PROFESSIONAL" : "HOMEOWNER";
  // next="/" is only ever sent by the private design portal's welcome card — that sign-up is for a client of a contractor, so don't offer the professional option.
  const fromPortal = next === "/";

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-6 py-16 text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />
      <div className="pointer-events-none absolute bottom-0 -left-20 h-96 w-96 rounded-full bg-blue-300/35 blur-2xl" />

      <div className="relative flex w-full max-w-sm flex-col gap-6 rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl shadow-blue-900/10">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Create your GlowUpp account</h1>
          {fromPortal ? (
            <p className="mt-2 text-sm text-zinc-600">A free account saves your designs and lets you send them to your contractor.</p>
          ) : next ? (
            <p className="mt-2 text-sm text-zinc-600">Your design is already saved — sign up to find a professional for it.</p>
          ) : (
            category && (
              <p className="mt-2 text-sm text-zinc-600">
                You&apos;ll land straight on a new {category.displayName.toLowerCase()} project after this.
              </p>
            )
          )}
        </div>
        <SignupForm projectType={category?.key} next={next} defaultRole={defaultRole} lockRole={fromPortal} />
        <p className="text-center text-sm text-zinc-600">
          Already have an account?{" "}
          <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-medium text-[#3a6694] underline">
            Log in
          </Link>
        </p>
        <p className="text-center text-xs text-zinc-500">
          By signing up, you agree to GlowUpp&rsquo;s{" "}
          <Link href="/terms" className="underline">Terms of Service</Link> and{" "}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
