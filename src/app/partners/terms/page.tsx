import Link from "next/link";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { PARTNER_TERMS } from "@/lib/partner-terms";
import { PARTNER_TERMS_VERSION } from "@/lib/partner-signup";

export const metadata: Metadata = pageMetadata({
  title: "Partner Terms — GlowUpp",
  description: "The terms of the GlowUpp partner programme for local businesses.",
  path: "/partners/terms",
});

export default function PartnerTermsPage() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="mx-auto w-full max-w-3xl">
        <Link href="/partners" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
          ← Back to the partner programme
        </Link>
        <h1 className="mt-6 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">Partner Terms</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Version {PARTNER_TERMS_VERSION}</p>
        <ol className="mt-10 list-decimal space-y-4 pl-6 text-zinc-700 dark:text-zinc-300">
          {PARTNER_TERMS.map((clause) => (
            <li key={clause}>{clause}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
