import Link from "next/link";

const STEPS = [
  {
    title: "1. Upload a photo",
    body: "Pick a room, driveway, garden, or exterior — take a photo or use one you already have. No sign-up required to get started.",
  },
  {
    title: "2. Tell us what you want",
    body: "A few quick questions about style, colours, and budget — GlowUpp uses your actual photo as the foundation, so the result stays true to your real space.",
  },
  {
    title: "3. See your AI redesign",
    body: "In about two minutes, get a realistic before/after. Not quite right? Regenerate, try a different style, or ask for specific changes.",
  },
  {
    title: "4. Find a professional",
    body: "Happy with a design? Push it to the open market and local, verified professionals can see it and send you a quote — entirely optional, no pressure.",
  },
  {
    title: "5. Compare quotes and hire",
    body: "Message professionals directly, compare quotes, and choose who does the work. GlowUpp doesn't take a cut of the job — professionals pay a small fee only once you've picked them.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-gradient-to-b from-blue-50 to-white text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />
      <div className="pointer-events-none absolute top-52 -left-32 h-96 w-96 rounded-full bg-blue-300/35 blur-2xl" />

      <section className="relative mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 py-16 text-center">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">How It Works</span>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          From photo to finished <span className="text-[#3a6694]">in five steps.</span>
        </h1>
      </section>

      <section className="relative mx-auto w-full max-w-2xl px-6 pb-12">
        <ol className="flex flex-col gap-6">
          {STEPS.map((step) => (
            <li key={step.title} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="mb-1 font-semibold text-[#132a4d]">{step.title}</p>
              <p className="text-sm text-zinc-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="relative mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 pb-16 text-center">
        <Link
          href="/#categories"
          className="inline-flex w-fit items-center gap-2 rounded-full bg-[#3a6694] px-6 py-3 text-sm font-medium text-white hover:bg-[#2c5075]"
        >
          Try It Free →
        </Link>
        <p className="text-sm text-zinc-500">
          A professional instead?{" "}
          <Link href="/professionals" className="underline">
            See how GlowUpp works for you
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
