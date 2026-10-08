/**
 * Marketing assets for B2B affiliate partners: pure functions that turn a
 * partner's name, link and a headline into an SVG string. The admin page
 * (src/app/admin/affiliates/AffiliateAssetCanvas.tsx) previews that SVG and
 * rasterises it to PNG/PDF in the browser. Kept free of DOM and React so it
 * can be unit-tested and so the preview and the download are byte-for-byte
 * the same drawing.
 *
 * Each design is drawn in a coordinate space equal to its PNG size (print
 * assets are 300 dpi), so there is no scaling step to get wrong.
 */

export type AssetKind = "social" | "coaster" | "sticker" | "poster";

export interface AssetSpec {
  label: string;
  hint: string;
  /** PNG size in pixels (also the SVG coordinate space). */
  width: number;
  height: number;
  /** Physical size for the PDF. */
  mmWidth: number;
  mmHeight: number;
  fileSuffix: string;
}

export const ASSET_SPECS: Record<AssetKind, AssetSpec> = {
  social: { label: "Social post", hint: "1080 × 1080 px for Instagram / Facebook", width: 1080, height: 1080, mmWidth: 200, mmHeight: 200, fileSuffix: "social-post" },
  coaster: { label: "Coaster / sticker", hint: "3.5 × 3.5 in (89 × 89 mm) at 300 dpi for coasters and square stickers, with cut guide", width: 1050, height: 1050, mmWidth: 88.9, mmHeight: 88.9, fileSuffix: "coaster" },
  sticker: { label: "Counter card", hint: "A6 (105 × 148 mm) for acrylic stands, tables and stickers, with cut guide", width: 1240, height: 1748, mmWidth: 105, mmHeight: 148, fileSuffix: "counter-card" },
  poster: { label: "A4 poster", hint: "A4 (210 × 297 mm) at 300 dpi for walls and windows", width: 2480, height: 3508, mmWidth: 210, mmHeight: 297, fileSuffix: "a4-poster" },
};

export const ASSET_KINDS = Object.keys(ASSET_SPECS) as AssetKind[];

export const DEFAULT_SUBLINE = "Snap a photo of your room. Scan the code. See it redesigned.";
export const SOCIAL_AND_POSTER_HEADLINE = "Redesign your home in seconds with AI";
export const COASTER_HEADLINE = "Scan to see your room redesigned";
const POSTER_STEPS = ["Snap a photo of your room", "Get your redesign", "Meet local pros"];

/** The QR code's own SVG: its viewBox and inner markup, lifted from qrcode.react's output. */
export interface QrArt {
  viewBox: string;
  content: string;
}

export interface AssetContent {
  headline: string;
  subline: string;
  businessName: string;
  /** The link the QR encodes, shown under it as plain text. */
  link: string;
  qr: QrArt;
}

const NAVY = "#132a4d";
const BLUE = "#3a6694";
const MUTED = "#5b6b82";
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** Average glyph width of bold Helvetica/Arial is about 0.56 em; 0.58 errs on the side of wrapping early rather than overflowing the edge. */
const AVG_CHAR_EM = 0.58;

export function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * AVG_CHAR_EM;
}

/** Font size for a single regular-weight line (a URL) so it never runs past `maxWidth`; regular text averages about 0.52 em per glyph. */
export function fitLineSize(text: string, maxWidth: number, startSize: number, minSize = 12): number {
  return Math.max(minSize, Math.min(startSize, Math.floor(maxWidth / (Math.max(1, text.length) * 0.52))));
}

/** Greedy word wrap by estimated width. A single word wider than the line gets its own line (the caller shrinks the font to fit). */
export function wrapText(text: string, fontSize: number, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && estimateTextWidth(next, fontSize) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Largest font size (down to `minSize`) at which the text fits `maxWidth` x `maxHeight`; below that it is hard-truncated with an ellipsis rather than overflowing the design. */
export function fitText(
  text: string,
  opts: { maxWidth: number; maxHeight: number; startSize: number; minSize: number; lineHeight?: number }
): { lines: string[]; fontSize: number; lineHeight: number } {
  const ratio = opts.lineHeight ?? 1.18;
  for (let size = opts.startSize; size >= opts.minSize; size -= 2) {
    const lines = wrapText(text, size, opts.maxWidth);
    const widest = Math.max(0, ...lines.map((l) => estimateTextWidth(l, size)));
    if (lines.length * size * ratio <= opts.maxHeight && widest <= opts.maxWidth) return { lines, fontSize: size, lineHeight: size * ratio };
  }
  const size = opts.minSize;
  const maxLines = Math.max(1, Math.floor(opts.maxHeight / (size * ratio)));
  const lines = wrapText(text, size, opts.maxWidth).slice(0, maxLines);
  const last = lines.length - 1;
  if (last >= 0 && wrapText(text, size, opts.maxWidth).length > maxLines) lines[last] = `${lines[last].replace(/[\s.,;:!?-]+$/, "")}…`;
  return { lines, fontSize: size, lineHeight: size * ratio };
}

function textBlock(lines: string[], x: number, y: number, fontSize: number, lineHeight: number, fill: string, opts: { anchor?: "start" | "middle"; weight?: number } = {}): string {
  const anchor = opts.anchor ?? "start";
  const spans = lines.map((l, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(l)}</tspan>`).join("");
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${fontSize}" font-weight="${opts.weight ?? 800}" fill="${fill}" text-anchor="${anchor}">${spans}</text>`;
}

/** A white rounded card with the QR code centred in it (the QR art already carries its own quiet-zone margin). */
function qrCard(qr: QrArt, x: number, y: number, size: number, radius: number): string {
  const pad = Math.round(size * 0.04);
  return (
    `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="#ffffff" stroke="#c7d6ea" stroke-width="${Math.max(2, Math.round(size / 160))}"/>` +
    `<svg x="${x + pad}" y="${y + pad}" width="${size - pad * 2}" height="${size - pad * 2}" viewBox="${escapeXml(qr.viewBox)}" shape-rendering="crispEdges">${qr.content}</svg>`
  );
}

/** The link as printed: no scheme (people type "glowupp.co.uk/a/…", they don't need "https://"). */
function shortLink(link: string): string {
  return link.replace(/^https?:\/\//, "");
}

function wrapSvg(width: number, height: number, body: string, defs = ""): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dbeafe"/><stop offset="1" stop-color="#ffffff"/></linearGradient>${defs}</defs>${body}</svg>`;
}

function socialPost(c: AssetContent): string {
  const { width: W, height: H } = ASSET_SPECS.social;
  const head = fitText(c.headline, { maxWidth: 920, maxHeight: 330, startSize: 92, minSize: 48 });
  const sub = fitText(c.subline, { maxWidth: 920, maxHeight: 110, startSize: 38, minSize: 26, lineHeight: 1.3 });
  const name = fitText(`With ${c.businessName}`, { maxWidth: 560, maxHeight: 100, startSize: 40, minSize: 24 });
  return wrapSvg(
    W,
    H,
    `<rect width="${W}" height="${H}" fill="url(#bg)"/>` +
      `<circle cx="${W - 60}" cy="80" r="260" fill="${BLUE}" opacity="0.12"/>` +
      `<text x="80" y="130" font-family="${FONT}" font-size="64" font-weight="800" fill="${NAVY}">GlowUpp</text>` +
      textBlock(head.lines, 80, 270, head.fontSize, head.lineHeight, NAVY) +
      textBlock(sub.lines, 80, 270 + head.lines.length * head.lineHeight + 20, sub.fontSize, sub.lineHeight, BLUE, { weight: 500 }) +
      `<rect x="60" y="715" width="960" height="310" rx="40" fill="#ffffff" opacity="0.9"/>` +
      qrCard(c.qr, 90, 735, 270, 24) +
      `<text x="400" y="830" font-family="${FONT}" font-size="54" font-weight="800" fill="${NAVY}">Scan to try it</text>` +
      textBlock(name.lines, 400, 895, name.fontSize, name.lineHeight, BLUE, { weight: 600 }) +
      `<text x="400" y="990" font-family="${FONT}" font-size="${fitLineSize(shortLink(c.link), 600, 28)}" fill="${MUTED}">${escapeXml(shortLink(c.link))}</text>`
  );
}

function coaster(c: AssetContent): string {
  const { width: W, height: H } = ASSET_SPECS.coaster;
  const head = fitText(c.headline, { maxWidth: 880, maxHeight: 150, startSize: 64, minSize: 34 });
  const name = fitText(c.businessName, { maxWidth: 860, maxHeight: 46, startSize: 40, minSize: 24 });
  const link = shortLink(c.link);
  return wrapSvg(
    W,
    H,
    `<rect width="${W}" height="${H}" fill="#ffffff"/>` +
      `<rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="56" fill="url(#bg)"/>` +
      `<rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="56" fill="none" stroke="#7c8da6" stroke-width="3" stroke-dasharray="18 12"/>` +
      `<text x="${W / 2}" y="108" text-anchor="middle" font-family="${FONT}" font-size="60" font-weight="800" fill="${NAVY}">GlowUpp</text>` +
      textBlock(head.lines, W / 2, 180, head.fontSize, head.lineHeight, NAVY, { anchor: "middle" }) +
      qrCard(c.qr, 255, 300, 540, 28) +
      `<text x="${W / 2}" y="905" text-anchor="middle" font-family="${FONT}" font-size="54" font-weight="800" fill="${BLUE}">Scan to try it</text>` +
      textBlock(name.lines, W / 2, 955, name.fontSize, name.lineHeight, MUTED, { anchor: "middle", weight: 600 }) +
      `<text x="${W / 2}" y="995" text-anchor="middle" font-family="${FONT}" font-size="${fitLineSize(link, 860, 24)}" fill="${MUTED}">${escapeXml(link)}</text>`
  );
}

function counterCard(c: AssetContent): string {
  const { width: W, height: H } = ASSET_SPECS.sticker;
  const head = fitText(c.headline, { maxWidth: 980, maxHeight: 470, startSize: 112, minSize: 60 });
  const name = fitText(c.businessName, { maxWidth: 980, maxHeight: 60, startSize: 54, minSize: 30 });
  return wrapSvg(
    W,
    H,
    `<rect width="${W}" height="${H}" fill="#ffffff"/>` +
      // Fill sits just inside the dashed cut line so a slightly off cut never leaves a white edge.
      `<rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="64" fill="url(#bg)"/>` +
      `<rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="64" fill="none" stroke="#7c8da6" stroke-width="3" stroke-dasharray="22 14"/>` +
      `<text x="${W / 2}" y="190" text-anchor="middle" font-family="${FONT}" font-size="88" font-weight="800" fill="${NAVY}">GlowUpp</text>` +
      textBlock(head.lines, W / 2, 330, head.fontSize, head.lineHeight, NAVY, { anchor: "middle" }) +
      qrCard(c.qr, 260, 750, 720, 36) +
      `<text x="${W / 2}" y="1565" text-anchor="middle" font-family="${FONT}" font-size="78" font-weight="800" fill="${BLUE}">Scan to try it</text>` +
      textBlock(name.lines, W / 2, 1626, name.fontSize, name.lineHeight, MUTED, { anchor: "middle", weight: 600 }) +
      `<text x="${W / 2}" y="1672" text-anchor="middle" font-family="${FONT}" font-size="${fitLineSize(shortLink(c.link), 980, 30)}" fill="${MUTED}">${escapeXml(shortLink(c.link))}</text>`
  );
}

function wallPoster(c: AssetContent): string {
  const { width: W, height: H } = ASSET_SPECS.poster;
  const head = fitText(c.headline, { maxWidth: 2080, maxHeight: 760, startSize: 270, minSize: 130 });
  const stepsTop = 560 + head.lines.length * head.lineHeight + 120;
  const steps = POSTER_STEPS.map((step, i) => {
    const y = stepsTop + i * 190;
    return (
      `<circle cx="270" cy="${y - 38}" r="66" fill="${BLUE}"/>` +
      `<text x="270" y="${y - 6}" text-anchor="middle" font-family="${FONT}" font-size="86" font-weight="800" fill="#ffffff">${i + 1}</text>` +
      `<text x="390" y="${y}" font-family="${FONT}" font-size="104" font-weight="600" fill="${NAVY}">${escapeXml(step)}</text>`
    );
  }).join("");

  // Bottom panel: QR on the left, a text column on the right (x 1400..2260), and the link centred underneath.
  const COL_X = 1400;
  const COL_W = 860;
  const title = fitText("Scan to try it", { maxWidth: COL_W, maxHeight: 380, startSize: 160, minSize: 90 });
  const titleY = 2440;
  const name = fitText(`With ${c.businessName}`, { maxWidth: COL_W, maxHeight: 260, startSize: 88, minSize: 48 });
  const nameY = titleY + (title.lines.length - 1) * title.lineHeight + 140;
  const sub = fitText(c.subline, { maxWidth: COL_W, maxHeight: 330, startSize: 60, minSize: 40, lineHeight: 1.35 });
  const subY = nameY + (name.lines.length - 1) * name.lineHeight + 120;
  const link = shortLink(c.link);
  return wrapSvg(
    W,
    H,
    `<rect width="${W}" height="${H}" fill="url(#bg)"/>` +
      `<circle cx="${W - 120}" cy="140" r="720" fill="${BLUE}" opacity="0.12"/>` +
      `<text x="200" y="360" font-family="${FONT}" font-size="190" font-weight="800" fill="${NAVY}">GlowUpp</text>` +
      textBlock(head.lines, 200, 700, head.fontSize, head.lineHeight, NAVY) +
      steps +
      `<rect x="150" y="2200" width="2180" height="1190" rx="90" fill="#ffffff" opacity="0.92"/>` +
      qrCard(c.qr, 230, 2250, 1000, 60) +
      textBlock(title.lines, COL_X, titleY, title.fontSize, title.lineHeight, NAVY) +
      textBlock(name.lines, COL_X, nameY, name.fontSize, name.lineHeight, BLUE, { weight: 600 }) +
      textBlock(sub.lines, COL_X, subY, sub.fontSize, sub.lineHeight, MUTED, { weight: 500 }) +
      `<text x="${W / 2}" y="3335" text-anchor="middle" font-family="${FONT}" font-size="${fitLineSize(link, 1900, 64)}" fill="${MUTED}">${escapeXml(link)}</text>`
  );
}

export function buildAssetSvg(kind: AssetKind, content: AssetContent): string {
  if (kind === "social") return socialPost(content);
  if (kind === "coaster") return coaster(content);
  if (kind === "sticker") return counterCard(content);
  return wallPoster(content);
}

export function defaultHeadline(kind: AssetKind, categoryHeadline: string): string {
  if (kind === "coaster") return COASTER_HEADLINE;
  return kind === "sticker" ? categoryHeadline : SOCIAL_AND_POSTER_HEADLINE;
}

export function assetFileName(businessSlug: string, kind: AssetKind, ext: "png" | "pdf"): string {
  return `glowupp-${businessSlug}-${ASSET_SPECS[kind].fileSuffix}.${ext}`;
}
