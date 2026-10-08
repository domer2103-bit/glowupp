"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PUBLIC_CATEGORY_OPTIONS } from "@/lib/partner-signup";
import { PARTNER_TERMS } from "@/lib/partner-terms";

// 16px text keeps iOS Safari from zooming into a focused field.
const INPUT = "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-[#132a4d] placeholder:text-zinc-400 focus:border-[#3a6694] focus:outline-none focus:ring-2 focus:ring-[#3a6694]/25";

const ERROR_FROM_REDIRECT: Record<string, string> = {
  invalid: "Please check your details and try again.",
  busy: "Too many attempts — please try again in an hour.",
  origin: "This form can only be submitted from glowupp.co.uk.",
};

/** The five-field partner sign-up. Posts to /api/affiliates/self-register; with JavaScript it shows errors inline and moves on, without it the browser does the same POST and follows the redirect. */
export function JoinForm({ redirectError }: { redirectError?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(redirectError ? (ERROR_FROM_REDIRECT[redirectError] ?? ERROR_FROM_REDIRECT.invalid) : null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = Object.fromEntries(fd.entries());
    body.accept_terms = fd.get("accept_terms") === "on";
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/affiliates/self-register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; redirect?: string; error?: string };
      if (res.ok && data.redirect) {
        router.push(data.redirect);
        return;
      }
      setError(data.error ?? "Something went wrong. Please try again.");
    } catch {
      setError("We couldn't reach GlowUpp. Check your connection and try again.");
    }
    setPending(false);
  }

  return (
    <form action="/api/affiliates/self-register" method="post" onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Business name
        <input name="business_name" required minLength={2} maxLength={80} autoComplete="organization" placeholder="Kite Coffee" className={INPUT} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Your name
        <input name="contact_name" required minLength={2} maxLength={80} autoComplete="name" placeholder="Sam Taylor" className={INPUT} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Email
        <input name="email" type="email" required maxLength={120} autoComplete="email" inputMode="email" placeholder="sam@kitecoffee.co.uk" className={INPUT} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Phone or WhatsApp
        <input name="phone" type="tel" required maxLength={30} autoComplete="tel" inputMode="tel" placeholder="07700 900123" className={INPUT} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        What kind of business?
        <select name="category" required defaultValue="" className={INPUT}>
          <option value="" disabled>
            Choose…
          </option>
          {PUBLIC_CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {/* Honeypot: invisible to people, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <details className="rounded-xl border border-zinc-200 bg-blue-50/50 px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium text-[#3a6694]">Partner terms (short version)</summary>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-zinc-700">
          {PARTNER_TERMS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </details>
      <label className="flex items-start gap-3 text-sm">
        <input name="accept_terms" type="checkbox" required className="mt-0.5 h-5 w-5 shrink-0 accent-[#3a6694]" />
        <span>I&apos;ve read and accept the partner terms above.</span>
      </label>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className="rounded-full bg-[#3a6694] px-6 py-3.5 text-base font-semibold text-white shadow-md shadow-blue-900/15 transition hover:bg-[#2c5075] disabled:opacity-60">
        {pending ? "Setting you up…" : "Get my partner link"}
      </button>
    </form>
  );
}
