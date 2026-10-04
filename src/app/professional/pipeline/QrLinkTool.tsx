"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";

const DOWNLOAD_PX = 1600; // ~13cm at 300dpi: sharp on a clipboard sheet, yard sign or van decal

export function QrLinkTool({ shortLink, vanLink, businessName, fileSlug }: { shortLink: string; vanLink: string; businessName: string; fileSlug: string }) {
  const [copied, setCopied] = useState<"short" | "van" | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const printCanvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFullscreen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  async function copy(which: "short" | "van") {
    try {
      await navigator.clipboard.writeText(which === "short" ? shortLink : vanLink);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard can be blocked (insecure context / permissions); the link is still shown to select by hand.
    }
  }

  function downloadPng() {
    const canvas = printCanvas.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `glowupp-${fileSlug}-qr.png`;
    a.click();
  }

  const linkRow = (label: string, link: string, which: "short" | "van") => (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-blue-50 px-3 py-2 text-sm">{link}</code>
        <button
          type="button"
          onClick={() => copy(which)}
          className="rounded-full border border-[#3a6694] px-4 py-2 text-sm font-medium text-[#3a6694] transition hover:bg-blue-50"
        >
          {copied === which ? "Copied ✓" : "Copy link"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {linkRow("Short link", shortLink, "short")}
      {linkRow("Van & yard-sign link", vanLink, "van")}

      <div className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:flex-row sm:items-start">
        <div className="rounded-xl bg-white p-3 ring-1 ring-zinc-200">
          <QRCodeSVG value={shortLink} size={192} level="H" marginSize={2} title={`QR code for ${businessName}`} />
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-600">
            A client who scans this lands in your private design portal: their renders go only to you, never to the open marketplace.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className="rounded-full bg-[#3a6694] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2c5075]"
            >
              Show full screen
            </button>
            <button
              type="button"
              onClick={downloadPng}
              className="rounded-full border border-[#3a6694] px-4 py-2 text-sm font-medium text-[#3a6694] transition hover:bg-blue-50"
            >
              Download print-quality PNG
            </button>
          </div>
        </div>
      </div>

      {/* Off-screen high-resolution copy used only for the PNG download. */}
      <div aria-hidden className="pointer-events-none fixed -left-[9999px] top-0">
        <QRCodeCanvas ref={printCanvas} value={shortLink} size={DOWNLOAD_PX} level="H" marginSize={4} />
      </div>

      {fullscreen && (
        <div role="dialog" aria-modal="true" aria-label="QR code" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-white p-6">
          <p className="text-center text-xl font-semibold text-[#132a4d]">Scan to start your design with {businessName}</p>
          <QRCodeSVG value={shortLink} size={Math.min(640, typeof window === "undefined" ? 320 : Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.7))} level="H" marginSize={2} />
          <p className="break-all text-center text-sm text-zinc-500">{shortLink}</p>
          <button
            type="button"
            autoFocus
            onClick={() => setFullscreen(false)}
            className="rounded-full border border-zinc-300 px-6 py-2 text-sm text-[#132a4d] hover:border-[#3a6694]"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
