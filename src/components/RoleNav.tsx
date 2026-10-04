"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

/** The signed-in nav links in SiteHeader — a client component only because it needs usePathname() to highlight the current section. */
export function RoleNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 transition ${
              active ? "bg-blue-50 text-[#132a4d]" : "hover:text-[#132a4d]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
