"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** The "For Customers / For Professionals" pill switch in SiteHeader — a client component only because it needs usePathname() to know which side is active. */
export function AudienceToggle() {
  const pathname = usePathname();
  const isProfessional = pathname.startsWith("/professionals");

  return (
    <div className="flex rounded-full border border-zinc-300 p-0.5 text-sm">
      <Link
        href="/"
        className={`rounded-full px-4 py-1.5 transition ${
          isProfessional ? "text-zinc-600 hover:text-[#132a4d]" : "bg-[#3a6694] text-white"
        }`}
      >
        For Customers
      </Link>
      <Link
        href="/professionals"
        className={`rounded-full px-4 py-1.5 transition ${
          isProfessional ? "bg-[#3a6694] text-white" : "text-zinc-600 hover:text-[#132a4d]"
        }`}
      >
        For Professionals
      </Link>
    </div>
  );
}
