import Link from "next/link";

export function Footer() {
  return (
    <footer className="flex justify-center gap-4 border-t border-zinc-200 px-6 py-4 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
      <span>© {new Date().getFullYear()} GlowUpp</span>
      <Link href="/privacy" className="hover:underline">Privacy</Link>
      <Link href="/terms" className="hover:underline">Terms</Link>
    </footer>
  );
}
