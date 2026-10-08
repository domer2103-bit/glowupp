"use client";

import { useMemo, useState, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { QrArt } from "@/lib/affiliate-assets";

/**
 * The QR modules for `link`, lifted from qrcode.react's own SVG so a
 * marketing asset embeds the real QR without a second encoder. Render the
 * returned `element` somewhere in the component (it is hidden); `art` is
 * null until that has mounted.
 */
export function useQrArt(link: string): { art: QrArt | null; element: ReactNode } {
  const [node, setNode] = useState<SVGSVGElement | null>(null);
  const art = useMemo(() => (node ? { viewBox: node.getAttribute("viewBox") ?? "0 0 33 33", content: node.innerHTML } : null), [node]);
  const element = (
    <div className="hidden" aria-hidden="true">
      {/* key={link}: a new link must mount a NEW svg, because `art` is read from the node when it mounts. Without it the QR would keep the first link's modules. */}
      <QRCodeSVG key={link} ref={setNode} value={link} size={256} level="M" marginSize={4} />
    </div>
  );
  return { art, element };
}
