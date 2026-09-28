import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/client";
import { logout } from "@/lib/actions/auth";

const CARD_CLASS =
  "flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md";

export default async function DashboardPage() {
  const user = await requireUser();

  if (user.role === UserRole.PROFESSIONAL) {
    const professional = await prisma.professional.findUnique({ where: { userId: user.id } });
    if (!professional) redirect("/professional/onboarding");
  }

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-6 py-16 text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />
      <div className="pointer-events-none absolute bottom-0 -left-20 h-96 w-96 rounded-full bg-blue-300/35 blur-2xl" />

      <div className="relative flex w-full max-w-lg flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Signed in as <span className="font-medium">{user.email}</span>
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {user.role === UserRole.ADMIN && (
            <Link href="/admin" className={CARD_CLASS}>
              <span className="font-medium">Admin</span>
              <span className="text-zinc-400">→</span>
            </Link>
          )}
          {user.role === UserRole.HOMEOWNER && (
            <Link href="/projects" className={CARD_CLASS}>
              <span className="font-medium">Your projects</span>
              <span className="text-zinc-400">→</span>
            </Link>
          )}
          {user.role === UserRole.PROFESSIONAL && (
            <>
              <Link href="/professional/open-projects" className={CARD_CLASS}>
                <span className="font-medium">Open projects</span>
                <span className="text-zinc-400">→</span>
              </Link>
              <Link href="/professional/opportunities" className={CARD_CLASS}>
                <span className="font-medium">Your quotes</span>
                <span className="text-zinc-400">→</span>
              </Link>
              <Link href="/professional/transactions" className={CARD_CLASS}>
                <span className="font-medium">Lead fees</span>
                <span className="text-zinc-400">→</span>
              </Link>
              <Link href="/professional/verification" className={CARD_CLASS}>
                <span className="font-medium">Get verified</span>
                <span className="text-zinc-400">→</span>
              </Link>
              <Link href="/professional/portfolio" className={CARD_CLASS}>
                <span className="font-medium">Portfolio</span>
                <span className="text-zinc-400">→</span>
              </Link>
            </>
          )}
        </div>

        <form action={logout} className="flex justify-center">
          <button type="submit" className="rounded-full border border-zinc-300 px-5 py-2 text-sm text-[#132a4d] hover:border-[#3a6694]">
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
