import { getAllWaitlistSignups } from "@/lib/data/admin";

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** Admin-only CSV export of the launch waitlist — getAllWaitlistSignups itself enforces requireRole(ADMIN), so an unauthorized request 404s/redirects before any data is read. */
export async function GET() {
  const signups = await getAllWaitlistSignups();

  const rows = [
    ["email", "source", "created_at"],
    ...signups.map((s) => [s.email, s.source ?? "", s.createdAt.toISOString()]),
  ];
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="glowupp-waitlist-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
