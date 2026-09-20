import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — GlowUpp",
  description: "How GlowUpp collects, uses, and protects your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="mx-auto w-full max-w-3xl">
        <Link href="/" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
          ← Back to GlowUpp
        </Link>

        <h1 className="mt-6 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Last updated: 20 September 2026</p>

        <div className="mt-10 space-y-10 text-zinc-700 dark:text-zinc-300">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">1. Who we are</h2>
            <p>
              GlowUpp (glowupp.co.uk) is operated by Dominik Wierzchowski, trading as GlowUpp, a
              sole trader based at 65 Sandway Crescent, Liverpool, L11 2SW, United Kingdom. For
              any question about this policy or your data, contact{" "}
              <a href="mailto:domer2103@gmail.com" className="underline">domer2103@gmail.com</a>.
            </p>
            <p>
              We are the &ldquo;data controller&rdquo; for the personal data described below, for
              the purposes of UK GDPR and the Data Protection Act 2018.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">2. What we collect</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li><strong>Account details</strong> — name, email address, and password (stored securely, never in plain text), plus whether you&rsquo;ve signed up as a homeowner or a professional.</li>
              <li><strong>Project information</strong> — photos of your space, your postcode/address, design preferences, and any AI-generated visualisations created from these.</li>
              <li><strong>Messages</strong> — content you send through GlowUpp&rsquo;s messaging feature, including to our AI design assistant and to professionals once you choose to request quotes.</li>
              <li><strong>Quote and matching data</strong> — details of quote requests, professional responses, and which professional (if any) you select.</li>
              <li><strong>Technical data</strong> — basic server logs (IP address, timestamps, error logs) kept for security and debugging.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">3. How we use it</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>To create and run your account and let you build renovation/design projects.</li>
              <li>To generate AI-assisted design visualisations from photos and descriptions you provide.</li>
              <li>To connect you with independent professionals when — and only when — you choose to request quotes, and to let professionals respond.</li>
              <li>To send transactional emails (e.g. account confirmations, new-message notifications, quote-reminder emails) — never marketing emails you haven&rsquo;t asked for.</li>
              <li>To keep the service secure and working properly.</li>
            </ul>
            <p>
              Our legal basis for this processing is that it&rsquo;s necessary to provide the
              service you&rsquo;ve signed up for (performance of a contract), or our legitimate
              interest in running and securing GlowUpp.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">4. Who we share it with</h2>
            <p>We use a small number of specialist service providers (&ldquo;processors&rdquo;) to run GlowUpp. We don&rsquo;t sell your data to anyone.</p>
            <ul className="list-disc space-y-2 pl-5">
              <li><strong>Supabase</strong> — hosts our database, handles account authentication, and stores uploaded photos.</li>
              <li><strong>Anthropic</strong> (Claude) — processes your project descriptions and messages to power the AI design assistant.</li>
              <li><strong>Kie.ai</strong> — generates the AI design visualisation images from your photos and prompts.</li>
              <li><strong>Resend</strong> — delivers transactional emails on our behalf.</li>
              <li><strong>Professionals you choose</strong> — if you request quotes, we share your project details and, once you accept a quote, your full address, with the professional(s) involved. Before that point, professionals only see your general area, not your exact address.</li>
            </ul>
            <p>
              Some of these providers process data outside the UK/EEA (including in the US).
              Where that happens, we rely on their standard contractual safeguards for
              international transfers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">5. Cookies and analytics</h2>
            <p>
              GlowUpp does not currently use any analytics or advertising cookies. We only use
              strictly necessary cookies to keep you signed in.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">6. How long we keep your data</h2>
            <p>
              We keep your account and project data for as long as your account is active. If you
              delete your account or ask us to, we&rsquo;ll delete your personal data within a
              reasonable time, except where we&rsquo;re required to keep something for legal
              reasons.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">7. Your rights</h2>
            <p>Under UK GDPR, you have the right to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Access the personal data we hold about you.</li>
              <li>Ask us to correct inaccurate data.</li>
              <li>Ask us to delete your data (&ldquo;right to be forgotten&rdquo;).</li>
              <li>Ask us to restrict or object to certain processing.</li>
              <li>Request a copy of your data in a portable format.</li>
              <li>Complain to the UK Information Commissioner&rsquo;s Office (ico.org.uk) if you think we&rsquo;ve mishandled your data.</li>
            </ul>
            <p>
              To exercise any of these, email{" "}
              <a href="mailto:domer2103@gmail.com" className="underline">domer2103@gmail.com</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">8. Children</h2>
            <p>GlowUpp is intended for users aged 18 and over. We don&rsquo;t knowingly collect data from children.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">9. Changes to this policy</h2>
            <p>
              We may update this policy as GlowUpp grows. We&rsquo;ll update the &ldquo;last
              updated&rdquo; date above when we do, and for material changes we&rsquo;ll try to
              let you know directly.
            </p>
          </section>

          <p className="border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            GlowUpp is currently operated as a sole trader business. This policy is written to be
            accurate and plain-spoken rather than exhaustive; if you have questions about how your
            data is handled, just ask.
          </p>
        </div>
      </div>
    </div>
  );
}
