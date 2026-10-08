"use client";

import { useState } from "react";

export function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (insecure context / permissions); the link is still shown to select by hand.
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-lg bg-blue-50 px-3 py-2 text-sm">{link}</code>
      <button type="button" onClick={copy} className="rounded-full border border-[#3a6694] px-4 py-2 text-sm font-medium text-[#3a6694] transition hover:bg-blue-50">
        {copied ? "Copied ✓" : "Copy link"}
      </button>
    </div>
  );
}
