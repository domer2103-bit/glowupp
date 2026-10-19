"use client";

import { useState } from "react";
import { ClientGuideVideo } from "@/components/ClientGuideVideo";

/** Ready-to-send message for a client: their private link plus the 50-second how-to guide. */
export function ShareGuideTool({ shortLink, guideLink, businessName }: { shortLink: string; guideLink: string; businessName: string }) {
  const message = `Hi, here's your private link to design your project with ${businessName}: ${shortLink}\n\nUpload a photo, see your space redesigned, then send it to me for an estimate. It's free and your design stays private between us. A 50-second guide to how it works: ${guideLink}`;
  const [copied, setCopied] = useState<"msg" | "guide" | null>(null);

  async function copy(text: string, which: "msg" | "guide") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard can be blocked; the text is shown above so it can be selected by hand.
    }
  }

  const btn = "rounded-full border border-[#3a6694] px-4 py-2 text-sm font-medium text-[#3a6694] transition hover:bg-blue-50";
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Send your client the guide</h2>
        <p className="mt-1 text-sm text-zinc-600">
          A 50-second video that shows your client how to scan your code, add a photo, see their design and send it to you for an estimate. Clients who open your link or QR code also see it on your page.
        </p>
      </div>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <ClientGuideVideo className="shrink-0" />
        <div className="flex w-full flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Message to copy and send (WhatsApp, text or email)</p>
          <pre className="whitespace-pre-wrap rounded-xl bg-blue-50 p-4 text-sm text-[#132a4d]">{message}</pre>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => copy(message, "msg")} className={btn}>
              {copied === "msg" ? "Copied ✓" : "Copy message"}
            </button>
            <button type="button" onClick={() => copy(guideLink, "guide")} className={btn}>
              {copied === "guide" ? "Copied ✓" : "Copy guide link only"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
