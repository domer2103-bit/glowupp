import Link from "next/link";
import type { Metadata } from "next";
import { JoinForm } from "./JoinForm";

export const metadata: Metadata = {
  title: "Become a GlowUpp partner",
  description: "Scan, sign up in a minute and get your own GlowUpp link, QR code and printable posters. Earn 50% of the fee when homeowners you send book a pro.",
};

export default async function PartnerJoinPage(props: PageProps<"/partner/join">) {
  const params = await props.searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-4 py-10 text-[#132a4d] sm:px-6 sm:py-16">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />
      <div className="pointer-events-none absolute bottom-0 -left-20 h-96 w-96 rounded-full bg-blue-300/35 blur-2xl" />

      <div className="relative flex w-full max-w-md flex-col gap-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl shadow-blue-900/10 sm:p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Partner with GlowUpp</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Put a QR code in your business. When homeowners you send book a professional through GlowUpp, you earn <strong>50%</strong> of the fee we collect. Free to join,
            takes a minute.
          </p>
        </div>
        <ul className="grid grid-cols-3 gap-2 text-center text-xs text-zinc-600">
          <li className="rounded-xl bg-blue-50 px-2 py-3">Instant link &amp; QR</li>
          <li className="rounded-xl bg-blue-50 px-2 py-3">Print-ready posters</li>
          <li className="rounded-xl bg-blue-50 px-2 py-3">Live earnings</li>
        </ul>
        <JoinForm redirectError={error} />
        <p className="text-center text-sm text-zinc-600">
          Want the details first?{" "}
          <Link href="/partners" className="font-medium text-[#3a6694] underline">
            How the partner programme works
          </Link>
        </p>
      </div>
    </div>
  );
}
