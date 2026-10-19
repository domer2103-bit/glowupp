import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { ClientGuideVideo } from "@/components/ClientGuideVideo";

export const metadata = pageMetadata({
  title: "How to use GlowUpp: a 50-second guide for homeowners",
  description: "Got a link or QR code from your tradesperson? See your project redesigned from your own photo, then send it to them for an estimate.",
  path: "/client-guide",
  noindex: true,
});

const STEPS = [
  ["Scan or tap", "Scan the QR code your tradesperson gave you, or tap their link."],
  ["Add a photo", "Choose the space, add a photo and answer a few quick questions about style, colours and budget."],
  ["See your space", "Your own photo, redesigned. Pick the look you like best."],
  ["Send it over", "Sign up free, then send your design to your tradesperson to ask for an official estimate. It stays private between you and them."],
  ["Get your estimate", "They reply with an itemised estimate with the price and timeline, and you can message them from the same page."],
];

export default function ClientGuidePage() {
  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-6 py-16 text-[#132a4d]">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Got a link from your tradesperson?</h1>
          <p className="mt-2 text-zinc-600">Here&apos;s how to use it, in five simple steps. It&apos;s free for homeowners.</p>
        </div>
        <ClientGuideVideo />
        <ol className="flex flex-col gap-4">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3a6694] font-bold text-white">{i + 1}</span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-zinc-600">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-center text-sm text-zinc-500">Use the link or QR code your tradesperson gave you. Illustration and AI-generated voice-over; the example estimate is not a real quote.</p>
        <div className="text-center">
          <Link href="/" className="inline-flex rounded-full border border-[#3a6694] px-6 py-3 text-sm font-medium text-[#3a6694] hover:bg-blue-50">
            Go to GlowUpp
          </Link>
        </div>
      </div>
    </div>
  );
}
