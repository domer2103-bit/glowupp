import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAllWaitlistSignups } from "@/lib/data/admin";
import { UserRole } from "@/generated/prisma/client";

export default async function AdminWaitlistPage() {
  await requireRole(UserRole.ADMIN);
  const signups = await getAllWaitlistSignups();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin" className="text-sm text-zinc-600 underline dark:text-zinc-400">
            ← Admin
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Launch waitlist</h1>
          <p className="mt-1 text-sm text-zinc-500">{signups.length} signed up so far.</p>
        </div>
        <a
          href="/admin/waitlist/export"
          className="shrink-0 rounded-full border border-zinc-400 px-4 py-2 text-xs dark:border-zinc-600"
        >
          Download CSV
        </a>
      </div>

      {signups.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">No signups yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {signups.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-zinc-300 px-4 py-3 text-sm dark:border-zinc-700"
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
  );
}
