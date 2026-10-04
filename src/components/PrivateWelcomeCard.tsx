import Link from "next/link";
import { getPortalReferrer } from "@/lib/data/private-pipeline";

/**
 * Homepage welcome for a visitor who arrived through a contractor's link or
 * QR. Gives people who want an account up front a clear way in, without
 * putting a sign-up wall in front of everyone else: they can start
 * designing as a guest and are asked to sign up when they send the render.
 * Renders nothing for everyone who didn't arrive through a link.
 */
export async function PrivateWelcomeCard({ signedIn }: { signedIn: boolean }) {
  const referrer = await getPortalReferrer();
  if (!referrer) return null;

  return (
    <section className="relative mx-auto w-full max-w-3xl px-6 pt-10">
      <div className="flex flex-col gap-4 rounded-3xl border border-[#3a6694]/30 bg-white p-6 text-center shadow-lg shadow-blue-900/10 sm:p-8">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Private design portal</span>
        <h2 className="text-2xl font-bold text-[#132a4d] sm:text-3xl">
          Design your project with <span className="text-[#3a6694]">{referrer.businessName}</span>
        </h2>
        <p className="mx-auto max-w-md text-sm text-zinc-600">
          Upload a photo, see your new space, and send it straight to {referrer.businessName} for an official estimate.
          Your designs stay private between you and them.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="#categories"
            className="inline-flex items-center gap-2 rounded-full bg-[#3a6694] px-6 py-3 text-sm font-medium text-white hover:bg-[#2c5075]"
          >
            Start designing
          </Link>
          {!signedIn && (
            <>
              <Link
                href={`/signup?next=${encodeURIComponent("/")}`}
                className="inline-flex items-center rounded-full border border-[#132a4d] px-6 py-3 text-sm font-medium text-[#132a4d] hover:bg-blue-50"
              >
                Sign up free
              </Link>
              <Link
                href={`/login?next=${encodeURIComponent("/")}`}
                className="inline-flex items-center rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-[#132a4d] hover:border-[#3a6694]"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
        {!signedIn && (
          <p className="text-xs text-zinc-500">
            A free account saves your designs and lets you send them to {referrer.businessName}.
          </p>
        )}
      </div>
    </section>
  );
}
