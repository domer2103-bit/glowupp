import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@/generated/prisma/client";
import { CategoryIcon } from "@/components/CategoryIcon";
import { AudienceToggle } from "@/components/AudienceToggle";

/**
 * Rendered once in the root layout so every route gets consistent
 * branding/navigation for free — previously each marketing page
 * (homepage, /redesign/[type], /professional/onboarding) built its own
 * header inline and every other page (login, dashboard, projects,
 * admin, professional/*) had none at all. Deliberately plain white/no
 * gradient of its own — each page's own themed background starts right
 * below it, the same way a neutral top bar sits above a colored hero on
 * most marketing sites.
 */
export async function SiteHeader() {
  const user = await getCurrentUser();
  const isHomeowner = user?.role === UserRole.HOMEOWNER;

  return (
    <header className="relative z-10 w-full border-b border-zinc-100 bg-white px-6 py-4 sm:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-[#132a4d]">
          <CategoryIcon type="exterior" className="h-6 w-6 text-[#3a6694]" />
          GlowUpp
        </Link>

        <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-zinc-600">
          <AudienceToggle />
          <Link href="/how-it-works" className="hover:text-[#132a4d]">
            How It Works
          </Link>
          {isHomeowner && (
            <Link href="/projects" className="hover:text-[#132a4d]">
              My Projects
            </Link>
          )}
        </nav>

        {user ? (
          <Link href="/dashboard" className="rounded-full border border-[#132a4d] px-4 py-2 text-sm text-[#132a4d]">
            Dashboard
          </Link>
        ) : (
          <Link href="/login" className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-[#132a4d]">
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
