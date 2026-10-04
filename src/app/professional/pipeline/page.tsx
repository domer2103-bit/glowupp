import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/client";
import { APP_URL } from "@/lib/notifications";
import { buildReferralLinks } from "@/lib/referral";
import { ensureReferralCodes, listPrivateLeads } from "@/lib/data/private-pipeline";
import { AutoRefresh } from "@/components/AutoRefresh";
import { QrLinkTool } from "./QrLinkTool";
import { LeadCard } from "./LeadCard";

export default async function PipelinePage(props: PageProps<"/professional/pipeline">) {
  const user = await requireRole(UserRole.PROFESSIONAL);
  const professional = await prisma.professional.findUnique({ where: { userId: user.id } });
  if (!professional) redirect("/professional/onboarding");

  const { tab } = await props.searchParams;
  const showLeads = tab === "leads";

  const { referralCode, vanQrSlug } = await ensureReferralCodes(professional);
  const leads = await listPrivateLeads(professional.id);
  const links = buildReferralLinks(APP_URL, referralCode, vanQrSlug);

  const tabClass = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-medium transition ${active ? "bg-[#3a6694] text-white" : "border border-zinc-300 text-[#132a4d] hover:border-[#3a6694]"}`;

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-6 py-16 text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />

      <div className="relative flex w-full max-w-2xl flex-col gap-6">
        <div>
          <Link href="/dashboard" className="text-sm text-zinc-600 underline">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Private client pipeline</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Give a client your link or QR code on site. Their designs go straight to you and can&apos;t be shared with other tradespeople.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/professional/pipeline" className={tabClass(!showLeads)}>
            Client Quote &amp; Lock Tool
          </Link>
          <Link href="/professional/pipeline?tab=leads" className={tabClass(showLeads)}>
            Private Leads &amp; Direct Renders{leads.length > 0 ? ` (${leads.length})` : ""}
          </Link>
        </div>

        {showLeads ? (
          <>
            <AutoRefresh />
            {leads.length === 0 ? (
              <p className="text-zinc-600">
                No private leads yet. When a client scans your code and starts a design, it appears here live.
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {leads.map((lead) => (
                  <LeadCard key={lead.sessionId} lead={lead} />
                ))}
              </ul>
            )}
            <p className="text-xs text-zinc-500">
              Until a client sends you their render for an estimate you only see their designs — no name, contact details or full address.
            </p>
          </>
        ) : (
          <QrLinkTool shortLink={links.shortLink} vanLink={links.vanLink} businessName={professional.businessName} fileSlug={vanQrSlug} />
        )}
      </div>
    </div>
  );
}
