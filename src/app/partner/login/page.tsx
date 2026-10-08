import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Partner sign-in — GlowUpp", robots: { index: false } };

export default async function PartnerLoginPage(props: PageProps<"/partner/login">) {
  const params = await props.searchParams;
  const expired = params.error === "expired";

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-4 py-10 text-[#132a4d] sm:px-6 sm:py-16">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />
      <div className="relative flex w-full max-w-md flex-col gap-5 rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl shadow-blue-900/10 sm:p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Partner sign-in</h1>
          <p className="mt-2 text-sm text-zinc-600">No password needed. We&apos;ll email you a link that opens your dashboard.</p>
        </div>
        {expired && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">That sign-in link has expired or isn&apos;t valid. Request a new one below.</p>}
        <LoginForm />
        <p className="text-center text-sm text-zinc-600">
          Not a partner yet?{" "}
          <Link href="/partner/join" className="font-medium text-[#3a6694] underline">
            Join in a minute
          </Link>
        </p>
      </div>
    </div>
  );
}
