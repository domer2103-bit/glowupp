import Link from "next/link";
import { COMPANY_NAME, COMPANY_NUMBER } from "@/lib/company";

export function Footer() {
  return (
    <footer className="flex justify-center gap-4 border-t border-zinc-200 px-6 py-4 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
      <span>© {new Date().getFullYear()} {COMPANY_NAME} (company no. {COMPANY_NUMBER})</span>
      <Link href="/blog" className="hover:underline">Blog</Link>
      <Link href="/partners" className="hover:underline">Partners</Link>
      <Link href="/privacy" className="hover:underline">Privacy</Link>
      <Link href="/terms" className="hover:underline">Terms</Link>
    </footer>
  );
}
