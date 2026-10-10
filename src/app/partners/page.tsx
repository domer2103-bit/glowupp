import Link from "next/link";
import type { Metadata } from "next";
import { LEAD_FEE_CAP_PENCE, LEAD_FEE_RATE, PRIVATE_LINK_FEE_RATE, PRIVATE_LINK_FREE_JOBS, calculateLeadFee, calculatePrivateLinkFee } from "@/lib/fees";
import { AFFILIATE_DEFAULT_SHARE_RATE, AFFILIATE_MIN_PAYOUT_PENCE, PRO_REFERRAL_EARNING_MONTHS, calculateAffiliateShare } from "@/lib/affiliate";
import { formatPence, formatPenceExact } from "@/lib/money";
import { SUPPORT_EMAIL } from "@/lib/partner-terms";

export const metadata: Metadata = {
  title: "Partner with GlowUpp — earn when your customers book a pro",
  description:
    "Put a GlowUpp QR code in your café, gym, garden centre, salon or trade counter, or share your link online. Free to join. Earn 50% of the fee GlowUpp collects when the people you send book a professional.",
};

const SHARE_PERCENT = Math.round(AFFILIATE_DEFAULT_SHARE_RATE * 100);
const FEE_PERCENT = Math.round(LEAD_FEE_RATE * 100);
const OWN_CLIENT_FEE_PERCENT = Math.round(PRIVATE_LINK_FEE_RATE * 1000) / 10;
const OWN_CLIENT_SHARE_PERCENT = Math.round(PRIVATE_LINK_FEE_RATE * AFFILIATE_DEFAULT_SHARE_RATE * 1000) / 10;
const MIN_PAYOUT = formatPence(AFFILIATE_MIN_PAYOUT_PENCE);
const WINDOW_TEXT = PRO_REFERRAL_EARNING_MONTHS === null ? "for as long as they use GlowUpp" : `for ${PRO_REFERRAL_EARNING_MONTHS} months after they sign up`;

// Worked examples, computed from the same rules the system uses, so this table can never disagree with what partners are actually paid.
const EXAMPLES = [50_000, 245_000, Math.round(LEAD_FEE_CAP_PENCE / LEAD_FEE_RATE)].map((quote) => {
  const fee = calculateLeadFee(quote);
  // The last row is the quote at which the fee hits its cap; anything larger earns the same.
  return { quote, fee, share: calculateAffiliateShare(fee), label: fee === LEAD_FEE_CAP_PENCE ? `${formatPence(quote)} or more` : formatPence(quote) };
});

// A tradesperson's own-client jobs (their own private link): their first few are free, then a 1% fee — so half of it is 0.5% of the quote.
const OWN_CLIENT_EXAMPLE_QUOTE = 245_000;
const OWN_CLIENT_FEE = calculatePrivateLinkFee(OWN_CLIENT_EXAMPLE_QUOTE, PRIVATE_LINK_FREE_JOBS);
const OWN_CLIENT_SHARE = calculateAffiliateShare(OWN_CLIENT_FEE);

const CARD = "rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm";
const BUTTON = "inline-flex w-fit items-center gap-2 rounded-full bg-[#3a6694] px-6 py-3 text-sm font-medium text-white hover:bg-[#2c5075]";

const FAQ: { q: string; a: string }[] = [
  { q: "Does it cost anything to join?", a: "No. Joining is free, there is no minimum, and the posters, coasters and social graphics are free to download and print yourself." },
  {
    q: "When and how am I paid?",
    a: `By bank transfer. We pay once we have checked your account and have your payment details, and once at least ${MIN_PAYOUT} is waiting for you. We only ever pay a share of a fee GlowUpp has actually received, and we'll be in touch to arrange it.`,
  },
  {
    q: "Why is my share smaller on some jobs?",
    a: `Your share is always half of the fee actually charged on that job. On jobs a professional finds through GlowUpp the fee is ${FEE_PERCENT}% of the quote (capped at ${formatPence(LEAD_FEE_CAP_PENCE)}). On a tradesperson's own-client jobs, through their own private link, it is only ${OWN_CLIENT_FEE_PERCENT}%, so your share is ${OWN_CLIENT_SHARE_PERCENT}% of the quote. Their first ${PRIVATE_LINK_FREE_JOBS} own-client jobs are free, and those earn nothing.`,
  },
  {
    q: "Why might a job earn me nothing?",
    a: "Some professionals are on a free introductory offer for their first jobs. No fee is charged on those jobs, so there is nothing to share. When it happens we tell you, by email and with a message on your dashboard, so it never looks like a mistake. Your share starts with the first fee a professional really pays.",
  },
  {
    q: "Can I see who I sent?",
    a: "No. Your dashboard shows how many people used your link, how many started a redesign, how many jobs were booked and what you have earned, but never names or details of homeowners or professionals.",
  },
  {
    q: "How does GlowUpp know a customer came from me?",
    a: "Your link and QR code remember you in that person's browser for 30 days. If someone opens more than one partner's link, the first one is the one credited.",
  },
  {
    q: "Can I promote my own jobs, or my own business?",
    a: "No. Jobs where the homeowner or the professional is you, or shares your email address or phone number, don't earn a share.",
  },
  {
    q: "What if I post about GlowUpp online?",
    a: 'Start the post with "#ad" or "Ad" so it is clear it is an advert, and don\'t make claims about GlowUpp (such as about price, speed or results) that are untrue or that we haven\'t agreed.',
  },
  {
    q: "Do I need a GlowUpp account to sign in?",
    a: "No. Partners sign in with an emailed link, with no password. A partner account is separate from a homeowner or professional account.",
  },
  { q: "Who do I contact?", a: `Email ${SUPPORT_EMAIL}.` },
];

export default function PartnersPage() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-gradient-to-b from-blue-50 to-white text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />
      <div className="pointer-events-none absolute top-[40rem] -left-32 h-96 w-96 rounded-full bg-blue-300/35 blur-2xl" />

      {/* Hero */}
      <section className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 py-16 text-center">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">GlowUpp Partners</span>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          Share Glow<span className="text-[#3a6694]">Upp</span>. Earn when it works.
        </h1>
        <p className="max-w-xl text-zinc-600">
          Homeowners photograph a room, see it redesigned, and find a local professional to build it. If you send them, you earn <strong>{SHARE_PERCENT}%</strong> of the fee
          GlowUpp collects when they book. Free to join, and it takes a minute.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link href="/partner/join" className={BUTTON}>
            Become a partner →
          </Link>
          <Link href="/partner/login" className="text-sm font-medium text-[#3a6694] underline">
            Already a partner? Sign in
          </Link>
        </div>
      </section>

      {/* Two ways to earn */}
      <section className="relative mx-auto w-full max-w-5xl px-6 py-8">
        <h2 className="mb-6 text-center text-2xl font-semibold">Two ways to earn</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className={CARD}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#3a6694]">Homeowner partners</p>
            <h3 className="mt-1 text-lg font-semibold">Send people with a home to improve</h3>
            <p className="mt-2 text-sm text-zinc-600">
              Cafés, gyms and studios, garden centres, salons, influencers — anywhere people have a few minutes and a phone. Put your QR code on a coaster, poster or counter card,
              or share your link.
            </p>
            <p className="mt-3 text-sm text-zinc-600">
              When someone opens your link, redesigns a room, picks a professional through GlowUpp and that professional pays their fee, you earn {SHARE_PERCENT}% of it.
            </p>
          </div>
          <div className={CARD}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#3a6694]">Tradespeople partners</p>
            <h3 className="mt-1 text-lg font-semibold">Bring tradespeople to GlowUpp</h3>
            <p className="mt-2 text-sm text-zinc-600">
              Trade suppliers and merchants, breakfast vans, anyone who knows builders, landscapers, painters and fitters. You get a second link and QR code made for tradespeople.
            </p>
            <p className="mt-3 text-sm text-zinc-600">
              When a tradesperson signs up through it and later wins jobs through GlowUpp, you earn {SHARE_PERCENT}% of the fee on each of their paid jobs, {WINDOW_TEXT}.
            </p>
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-zinc-500">One partner account gives you both links.</p>
      </section>

      {/* How it works */}
      <section className="relative mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 px-6 py-8 sm:grid-cols-3">
        <div className={CARD}>
          <p className="mb-1 font-semibold">1. Sign up</p>
          <p className="text-sm text-zinc-600">Five questions on your phone. Your account, links, QR codes and printables are ready straight away.</p>
        </div>
        <div className={CARD}>
          <p className="mb-1 font-semibold">2. Share</p>
          <p className="text-sm text-zinc-600">Print a poster, coaster or counter card, or post your link. Make a graphic for your socials in one click.</p>
        </div>
        <div className={CARD}>
          <p className="mb-1 font-semibold">3. Earn</p>
          <p className="text-sm text-zinc-600">Watch visits, redesigns and jobs on your dashboard. We pay what you&apos;ve earned by bank transfer.</p>
        </div>
      </section>

      {/* Earnings */}
      <section className="relative mx-auto w-full max-w-3xl px-6 py-10">
        <h2 className="mb-2 text-center text-2xl font-semibold">What you can earn</h2>
        <p className="mb-5 text-center text-sm text-zinc-600">
          When a professional wins a job, GlowUpp charges them {FEE_PERCENT}% of the accepted quote, capped at {formatPence(LEAD_FEE_CAP_PENCE)}. You earn {SHARE_PERCENT}% of that fee.
        </p>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Accepted quote</th>
                <th className="px-4 py-3 font-semibold">GlowUpp fee</th>
                <th className="px-4 py-3 font-semibold">You earn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {EXAMPLES.map((e) => (
                <tr key={e.quote}>
                  <td className="px-4 py-3">{e.label}</td>
                  <td className="px-4 py-3 tabular-nums">{formatPenceExact(e.fee)}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{formatPenceExact(e.share)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 text-sm shadow-sm">
          <p className="font-semibold">When a tradesperson you brought works for their own clients</p>
          <p className="mt-2 text-zinc-600">
            Tradespeople can also use GlowUpp for the clients they already have, through their own private link. On those jobs they pay only {OWN_CLIENT_FEE_PERCENT}% instead of {FEE_PERCENT}%, and their first{" "}
            {PRIVATE_LINK_FREE_JOBS} such jobs are free. Your share is always half of the fee actually charged, so:
          </p>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-zinc-600">
            <li>Their first {PRIVATE_LINK_FREE_JOBS} own-client jobs: no fee, so you earn nothing (we tell you).</li>
            <li>
              After that: {OWN_CLIENT_FEE_PERCENT}% fee, so you earn <strong>{OWN_CLIENT_SHARE_PERCENT}% of the quote</strong> — on a {formatPence(OWN_CLIENT_EXAMPLE_QUOTE)} job the fee is {formatPenceExact(OWN_CLIENT_FEE)} and
              you earn {formatPenceExact(OWN_CLIENT_SHARE)}.
            </li>
          </ul>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Please read this — what to expect, honestly</p>
          <ul className="mt-2 flex list-disc flex-col gap-2 pl-5">
            <li>You earn only when a professional <strong>pays</strong> their fee. People who look but don&apos;t book earn you nothing.</li>
            <li>
              <strong>Free promotional jobs earn nothing.</strong> Some professionals get their first jobs free. No fee is charged on those, so there is nothing to share. We tell you by email and on
              your dashboard when it happens.
            </li>
            <li>
              For tradespeople you bring, your share applies to jobs won {WINDOW_TEXT}.
            </li>
            <li>On a tradesperson&apos;s own-client jobs the fee is only {OWN_CLIENT_FEE_PERCENT}% (after their first {PRIVATE_LINK_FREE_JOBS} free ones), so your share there is {OWN_CLIENT_SHARE_PERCENT}% of the quote.</li>
            <li>One fee is shared with one partner at most — the partner the homeowner came through comes first.</li>
            <li>Payments are by bank transfer once your account is checked and at least {MIN_PAYOUT} is waiting.</li>
            <li>Think of it as a bonus on top of something useful for your customers, not as guaranteed income. Early on you may earn nothing at all.</li>
          </ul>
        </div>
      </section>

      {/* What you get */}
      <section className="relative mx-auto w-full max-w-5xl px-6 py-8">
        <h2 className="mb-6 text-center text-2xl font-semibold">What you get</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className={CARD}>
            <p className="mb-1 font-semibold">Your own links and QR codes</p>
            <p className="text-sm text-zinc-600">One for homeowners, one for tradespeople, both tracked to you.</p>
          </div>
          <div className={CARD}>
            <p className="mb-1 font-semibold">Printables, free</p>
            <p className="text-sm text-zinc-600">A4 poster, 3.5 inch coaster, counter card and social graphic with your name on them, as PNG or PDF.</p>
          </div>
          <div className={CARD}>
            <p className="mb-1 font-semibold">A live dashboard</p>
            <p className="text-sm text-zinc-600">Visits, redesigns started, jobs booked, what you&apos;ve earned and been paid. Never anyone&apos;s personal details.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative mx-auto w-full max-w-3xl px-6 py-10">
        <h2 className="mb-6 text-center text-2xl font-semibold">Questions</h2>
        <div className="flex flex-col gap-3">
          {FAQ.map((item) => (
            <details key={item.q} className="group rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
              <summary className="cursor-pointer list-none font-medium marker:hidden">
                <span className="mr-2 inline-block text-[#3a6694] transition group-open:rotate-90">›</span>
                {item.q}
              </summary>
              <p className="mt-2 text-sm text-zinc-600">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final call to action */}
      <section className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-3 px-6 pb-20 text-center">
        <h2 className="text-2xl font-semibold">Ready to start?</h2>
        <p className="text-sm text-zinc-600">It&apos;s free, and you can download your first poster today.</p>
        <Link href="/partner/join" className={BUTTON}>
          Become a partner →
        </Link>
        <p className="text-xs text-zinc-500">
          By joining you accept the short partner terms shown on the sign-up page. Questions? <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">{SUPPORT_EMAIL}</a>
        </p>
      </section>
    </div>
  );
}
