"use client";

import { useState } from "react";
import { buildAssetSvg, defaultHeadline, DEFAULT_SUBLINE } from "@/lib/affiliate-assets";
import { exportAssetFile } from "@/lib/affiliate-assets-client";
import { useQrArt } from "@/components/useQrArt";

/** One-tap A4 poster PDF for the sign-up success screen, drawn in the browser from the partner's own QR (the same renderer as the dashboard's full set of assets). */
export function PosterDownload(props: { businessName: string; businessSlug: string; link: string; categoryHeadline: string }) {
  const { art, element } = useQrArt(props.link);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    if (!art) return;
    setBusy(true);
    setError(null);
    try {
      const svg = buildAssetSvg("poster", {
        headline: defaultHeadline("poster", props.categoryHeadline),
        subline: DEFAULT_SUBLINE,
        businessName: props.businessName,
        link: props.link,
        qr: art,
      });
      await exportAssetFile(svg, "poster", "pdf", props.businessSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The PDF could not be created.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {element}
      <button
        type="button"
        onClick={download}
        disabled={!art || busy}
        className="w-full rounded-full bg-[#3a6694] px-6 py-3.5 text-base font-semibold text-white shadow-md shadow-blue-900/15 transition hover:bg-[#2c5075] disabled:opacity-60"
      >
        {busy ? "Preparing your poster…" : "Download Printable Poster PDF"}
      </button>
      {error && (
        <p role="alert" className="text-center text-sm text-red-600">
          {error}
        </p>
      )}
    </>
  );
}
