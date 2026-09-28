import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAllWaitlistSignups } from "@/lib/data/admin";
import { UserRole } from "@/generated/prisma/client";

export default async function AdminWaitlistPage() {
  await requireRole(UserRole.ADMIN);
  const signups = await getAllWaitlistSignups();

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-6 py-16 text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />

      <div className="relative flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <Link href="/admin" className="text-sm text-zinc-600 underline">
              ← Admin
            </Link>
            <h1 className="mt-2 text-2xl font-semibold">Launch waitlist</h1>
            <p className="mt-1 text-sm text-zinc-500">{signups.length} signed up so far.</p>
          </div>
          <a
            href="/admin/waitlist/export"
            className="shrink-0 rounded-full border border-[#3a6694] px-4 py-2 text-xs font-medium text-[#3a6694] hover:bg-blue-50"
          >
            Download CSV
          </a>
        </div>

        {signups.length === 0 ? (
          <p className="text-zinc-600">No signups yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {signups.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm shadow-sm"
              >
                <span>{s.email}</span>
                <span className="text-xs text-zinc-500">
                  {s.source ? `${s.source} · ` : ""}
                  {new Date(s.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
