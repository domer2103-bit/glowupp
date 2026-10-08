import { ASSET_SPECS, assetFileName, type AssetKind } from "@/lib/affiliate-assets";

/** Browser-only helpers shared by every screen that exports a partner asset (admin partner page, partner dashboard, sign-up success). They turn the SVG from buildAssetSvg into a PNG or PDF; keep them out of server code. */

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Draws the design onto a canvas at its full print resolution (the SVG's own pixel size). */
export async function renderToCanvas(svg: string, width: number, height: number): Promise<HTMLCanvasElement> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("The design could not be drawn."));
    img.src = svgDataUrl(svg);
  });
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot create a canvas.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Rasterises the SVG and downloads it as a high-resolution PNG, or as a PDF page of the asset's real printed size (jsPDF is loaded only when a PDF is asked for). */
export async function exportAssetFile(svg: string, kind: AssetKind, format: "png" | "pdf", businessSlug: string): Promise<void> {
  const spec = ASSET_SPECS[kind];
  const canvas = await renderToCanvas(svg, spec.width, spec.height);
  if (format === "png") {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("The image could not be created.");
    saveBlob(blob, assetFileName(businessSlug, kind, "png"));
    return;
  }
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: spec.mmWidth > spec.mmHeight ? "landscape" : "portrait", unit: "mm", format: [spec.mmWidth, spec.mmHeight] });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, spec.mmWidth, spec.mmHeight, undefined, "FAST");
  pdf.save(assetFileName(businessSlug, kind, "pdf"));
}
