import Link from "next/link";
import { CategoryIcon } from "@/components/CategoryIcon";
import { BeforeAfterImage } from "@/components/BeforeAfterImage";
import { WaitlistForm } from "./WaitlistForm";

export default async function LaunchPage(props: PageProps<"/launch">) {
  const params = await props.searchParams;
  const source = typeof params.source === "string" ? params.source : undefined;

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-6 py-16 text-center text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />
      <div className="pointer-events-none absolute top-52 -left-32 h-96 w-96 rounded-full bg-blue-300/35 blur-2xl" />

      <Link href="/" className="relative mb-10 flex items-center gap-2 text-lg font-bold text-[#132a4d]">
        <CategoryIcon type="exterior" className="h-6 w-6 text-[#3a6694]" />
        GlowUpp
      </Link>

      <span className="relative text-xs font-semibold uppercase tracking-wide text-[#3a6694]">Launching Soon</span>
      <h1 className="relative mt-3 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
        Upload. Reimagine. <span className="text-[#3a6694]">See Your New Space.</span>
      </h1>
      <p className="relative mt-4 max-w-md text-zinc-600">
        Turn a photo of your home into a stunning AI redesign in seconds — then find the right pro to make it real. Join the
        waitlist to be the first to know when we launch.
      </p>

      <div className="relative mt-8">
        <WaitlistForm source={source} />
      </div>

      <div className="relative mt-16 w-full max-w-3xl overflow-hidden rounded-2xl border-4 border-white shadow-xl shadow-blue-900/10">
        <BeforeAfterImage src="/homepage/hero.jpg" alt="Kitchen before and after AI redesign" width={1200} height={400} priority />
      </div>
    </div>
  );
}
