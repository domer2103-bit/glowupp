import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/client";
import { logout } from "@/lib/actions/auth";

export default async function DashboardPage() {
  const user = await requireUser();

  if (user.role === UserRole.PROFESSIONAL) {
    const professional = await prisma.professional.findUnique({ where: { userId: user.id } });
    if (!professional) redirect("/professional/onboarding");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 py-16 text-center dark:bg-black">
      <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Signed in as <span className="font-medium">{user.email}</span> — role: {user.role}
      </p>
      {user.role === UserRole.ADMIN && (
        <Link href="/admin" className="rounded-full bg-black px-5 py-3 text-white dark:bg-white dark:text-black">
          Admin
        </Link>
      )}
      {user.role === UserRole.HOMEOWNER && (
        <Link href="/projects" className="rounded-full bg-black px-5 py-3 text-white dark:bg-white dark:text-black">
          Your projects
        </Link>
      )}
      {user.role === UserRole.PROFESSIONAL && (
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/professional/open-projects" className="rounded-full bg-black px-5 py-3 text-white dark:bg-white dark:text-black">
            Open projects
          </Link>
          <Link href="/professional/opportunities" className="rounded-full border border-black px-5 py-3 dark:border-white">
            Your quotes
          </Link>
          <Link href="/professional/transactions" className="rounded-full border border-black px-5 py-3 dark:border-white">
            Lead fees
          </Link>
          <Link href="/professional/verification" className="rounded-full border border-black px-5 py-3 dark:border-white">
            Get verified
          </Link>
          <Link href="/professional/portfolio" className="rounded-full border border-black px-5 py-3 dark:border-white">
            Portfolio
          </Link>
        </div>
      )}
      <form action={logout}>
        <button type="submit" className="rounded-full border border-black px-5 py-3 dark:border-white">
          Log out
        </button>
      </form>
    </div>
  );
}
