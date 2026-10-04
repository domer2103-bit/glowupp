import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/client";
import { logout } from "@/lib/actions/auth";

const CARD_CLASS =
  "flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md";

const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.HOMEOWNER]: "Homeowner account",
  [UserRole.PROFESSIONAL]: "Professional account",
  [UserRole.ADMIN]: "Admin account",
};

function DashboardCard({ href, title, description }: { href: string; title: string; description?: string }) {
  return (
    <Link href={href} className={CARD_CLASS}>
      <span>
        <span className="block font-medium">{title}</span>
        {description && <span className="mt-0.5 block text-sm text-zinc-500">{description}</span>}
      </span>
      <span className="text-zinc-400">→</span>
    </Link>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
      {children}
    </section>
  );
}

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
          <span className="mb-3 inline-block rounded-full bg-[#3a6694] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            {ROLE_LABEL[user.role]}
          </span>
          <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Signed in as <span className="font-medium">{user.email}</span>
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {user.role === UserRole.ADMIN && <DashboardCard href="/admin" title="Admin" />}
          {user.role === UserRole.HOMEOWNER && <DashboardCard href="/projects" title="Your projects" />}
          {user.role === UserRole.PROFESSIONAL && (
            <>
              <Section title="Leads & quotes">
                <DashboardCard
                  href="/professional/pipeline"
                  title="Client Quote &amp; Lock Tool"
                  description="Your personal link and QR code. Clients who use it stay private to you."
                />
                <DashboardCard
                  href="/professional/open-projects"
                  title="Open projects"
                  description="Homeowners in your area looking for quotes."
                />
                <DashboardCard href="/professional/opportunities" title="Your quotes" />
              </Section>
              <Section title="Money">
                <DashboardCard href="/professional/transactions" title="Lead fees" />
              </Section>
              <Section title="Your profile">
                <DashboardCard href="/professional/verification" title="Get verified" />
                <DashboardCard href="/professional/portfolio" title="Portfolio" />
              </Section>
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
