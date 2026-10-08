"use client";

import { useMemo, useState } from "react";
import {
  ASSET_KINDS,
  ASSET_SPECS,
  AUDIENCE_COPY,
  buildAssetSvg,
  defaultHeadline,
  type AssetAudience,
  type AssetKind,
} from "@/lib/affiliate-assets";
import { exportAssetFile, svgDataUrl } from "@/lib/affiliate-assets-client";
import { useQrArt } from "@/components/useQrArt";

const INPUT = "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-[#132a4d]";
const BUTTON = "rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-50";

/**
 * Preview and export of a partner's marketing assets (shown to admins and to the
 * partner themselves): a social post, a 3.5-inch coaster, an A6 counter card and an A4 poster, each carrying the partner's name
 * and their personal QR code. The preview is the exact SVG that gets
 * rasterised for the PNG and embedded in the PDF
 * (src/lib/affiliate-assets.ts), so what you see is what prints.
 */
export function AffiliateAssetCanvas(props: { businessName: string; businessSlug: string; link: string; proLink?: string; categoryHeadline: string }) {
  const [audience, setAudience] = useState<AssetAudience>("homeowner");
  const [kind, setKind] = useState<AssetKind>("poster");
  // Edits are kept per audience and asset type, so switching audience never carries one's wording onto the other.
  const [headlines, setHeadlines] = useState<Partial<Record<string, string>>>({});
  const [sublines, setSublines] = useState<Partial<Record<AssetAudience, string>>>({});
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const link = audience === "professional" && props.proLink ? props.proLink : props.link;
  const { art: qr, element: qrElement } = useQrArt(link);

  const spec = ASSET_SPECS[kind];
  const headline = headlines[`${audience}:${kind}`] ?? defaultHeadline(kind, props.categoryHeadline, audience);
  const subline = sublines[audience] ?? AUDIENCE_COPY[audience].subline;

  const svg = useMemo(() => {
    if (!qr) return null;
    return buildAssetSvg(kind, {
      headline,
      subline,
      businessName: props.businessName,
      link,
      qr,
      audience,
    });
  }, [qr, kind, headline, subline, props.businessName, link, audience]);

  async function exportAs(format: "png" | "pdf") {
    if (!svg) return;
    setBusy(format);
    setError(null);
    try {
      await exportAssetFile(svg, kind, format, audience === "professional" ? `${props.businessSlug}-trades` : props.businessSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {qrElement}

      {props.proLink && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Who the asset is for">
          {(Object.keys(AUDIENCE_COPY) as AssetAudience[]).map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={a === audience}
              onClick={() => setAudience(a)}
              className={`${BUTTON} border ${a === audience ? "border-[#132a4d] bg-[#132a4d] text-white" : "border-zinc-300 bg-white text-[#132a4d] hover:border-[#132a4d]"}`}
            >
              {AUDIENCE_COPY[a].label}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Asset type">
        {ASSET_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={k === kind}
            onClick={() => setKind(k)}
            className={`${BUTTON} border ${k === kind ? "border-[#3a6694] bg-[#3a6694] text-white" : "border-zinc-300 bg-white text-[#132a4d] hover:border-[#3a6694]"}`}
          >
            {ASSET_SPECS[k].label}
          </button>
        ))}
      </div>
      <p className="text-xs text-zinc-500">{spec.hint}</p>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 items-start justify-center rounded-2xl border border-zinc-200 bg-zinc-100 p-4">
          {svg ? (
            // eslint-disable-next-line @next/next/no-img-element -- a generated data: URL preview, nothing for next/image to optimise
            <img src={svgDataUrl(svg)} alt={`${spec.label} preview for ${props.businessName}`} className="max-h-[70vh] w-auto max-w-full rounded shadow-md" />
          ) : (
            <p className="p-8 text-sm text-zinc-500">Preparing preview…</p>
          )}
        </div>

        <div className="flex w-full flex-col gap-3 lg:w-72">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Headline</span>
            <textarea
              value={headline}
              onChange={(e) => setHeadlines((h) => ({ ...h, [`${audience}:${kind}`]: e.target.value }))}
              rows={3}
              maxLength={140}
              className={INPUT}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Small print</span>
            <textarea value={subline} onChange={(e) => setSublines((x) => ({ ...x, [audience]: e.target.value }))} rows={2} maxLength={120} className={INPUT} />
          </label>
          <p className="text-xs text-zinc-500">
            Check every claim (&ldquo;in seconds&rdquo;, &ldquo;free&rdquo;) against the live product before printing.
          </p>
          <button type="button" disabled={!svg || busy !== null} onClick={() => exportAs("png")} className={`${BUTTON} bg-[#3a6694] text-white hover:bg-[#2c5075]`}>
            {busy === "png" ? "Preparing PNG…" : "Download high-res PNG"}
          </button>
          <button type="button" disabled={!svg || busy !== null} onClick={() => exportAs("pdf")} className={`${BUTTON} border border-[#3a6694] text-[#3a6694] hover:bg-blue-50`}>
            {busy === "pdf" ? "Preparing PDF…" : "Export PDF"}
          </button>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        </div>
      </div>
    </div>
  );
}
