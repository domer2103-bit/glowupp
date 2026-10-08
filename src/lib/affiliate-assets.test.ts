import { describe, expect, it } from "vitest";
import { ASSET_KINDS, ASSET_SPECS, assetFileName, buildAssetSvg, escapeXml, estimateTextWidth, fitLineSize, fitText, wrapText, type AssetContent } from "./affiliate-assets";

const QR = { viewBox: "0 0 41 41", content: '<path fill="#ffffff" d="M0,0h41v41H0z"/><path fill="#000000" d="M4,4h7v7H4z"/>' };

/** The words a person would read off the design: tags dropped, wrapped lines rejoined with spaces. */
function readable(svg: string): string {
  return svg.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

function content(over: Partial<AssetContent> = {}): AssetContent {
  return {
    headline: "Bored waiting for your latte? Scan to see your dream living room",
    subline: "Snap a photo of your room. Scan the code. See it redesigned.",
    businessName: "The Daily Grind",
    link: "https://www.glowupp.co.uk/a/the-daily-grind-ab2c",
    qr: QR,
    ...over,
  };
}

describe("text fitting", () => {
  it("wraps on word boundaries and never exceeds the line width", () => {
    const lines = wrapText("Bored waiting for your latte? Scan to see your dream living room", 80, 700);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(estimateTextWidth(l, 80)).toBeLessThanOrEqual(700);
    expect(lines.join(" ")).toBe("Bored waiting for your latte? Scan to see your dream living room");
  });

  it("shrinks the font until a long headline fits its box", () => {
    const short = fitText("Hello", { maxWidth: 900, maxHeight: 300, startSize: 100, minSize: 40 });
    const long = fitText("word ".repeat(40).trim(), { maxWidth: 900, maxHeight: 300, startSize: 100, minSize: 40 });
    expect(short.fontSize).toBe(100);
    expect(long.fontSize).toBeLessThan(100);
    expect(long.lines.length * long.lineHeight).toBeLessThanOrEqual(300 + 1);
  });

  it("truncates with an ellipsis rather than overflowing when even the smallest size cannot fit", () => {
    const r = fitText("word ".repeat(400).trim(), { maxWidth: 400, maxHeight: 120, startSize: 60, minSize: 30 });
    expect(r.fontSize).toBe(30);
    expect(r.lines[r.lines.length - 1].endsWith("…")).toBe(true);
    expect(r.lines.length * r.lineHeight).toBeLessThanOrEqual(120 + 1);
  });

  it("copes with a single very long word and empty text", () => {
    expect(fitText("Supercalifragilisticexpialidocious".repeat(3), { maxWidth: 500, maxHeight: 200, startSize: 90, minSize: 24 }).lines.length).toBeGreaterThan(0);
    expect(wrapText("   ", 50, 500)).toEqual([]);
  });
});

describe("fitLineSize", () => {
  it("keeps the start size when the line already fits, and shrinks a long URL to the space it has", () => {
    expect(fitLineSize("glowupp.co.uk", 600, 28)).toBe(28);
    const url = "www.glowupp.co.uk/a/the-daily-grind-and-bakery-on-the-high-street-ab2c";
    const size = fitLineSize(url, 600, 28);
    expect(size).toBeLessThan(28);
    expect(url.length * size * 0.52).toBeLessThanOrEqual(600);
    expect(fitLineSize(url, 10, 28, 12)).toBe(12); // never below the floor
  });
});

describe("buildAssetSvg", () => {
  it.each(ASSET_KINDS)("%s: is a well-formed SVG at its exact pixel size, with the QR and the partner name", (kind) => {
    const svg = buildAssetSvg(kind, content());
    const spec = ASSET_SPECS[kind];
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).toContain(`width="${spec.width}" height="${spec.height}" viewBox="0 0 ${spec.width} ${spec.height}"`);
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(svg).toContain('d="M4,4h7v7H4z"'); // the QR modules made it in
    expect(readable(svg)).toContain("The Daily Grind");
    expect(readable(svg)).toContain("glowupp.co.uk/a/the-daily-grind-ab2c");
    expect(svg).not.toContain("https://www.glowupp.co.uk/a/"); // the printed link drops the scheme
  });

  it("escapes a hostile business name instead of injecting markup", () => {
    const svg = buildAssetSvg("poster", content({ businessName: `Tom & Jerry's <script>alert(1)</script> "Café"` }));
    expect(svg).not.toContain("<script>");
    expect(readable(svg)).toContain("Tom &amp; Jerry&apos;s &lt;script&gt;alert(1)&lt;/script&gt; &quot;Café&quot;");
    // Still parseable XML structure: every < starts a known tag.
    for (const m of svg.matchAll(/<\/?([a-zA-Z]+)/g)) expect(["svg", "defs", "linearGradient", "stop", "rect", "circle", "text", "tspan", "path"]).toContain(m[1]);
  });

  it("handles a very long business name and headline without throwing", () => {
    for (const kind of ASSET_KINDS) {
      expect(() => buildAssetSvg(kind, content({ businessName: "A".repeat(300), headline: "Scan ".repeat(120) }))).not.toThrow();
    }
  });

  it("escapes XML specials", () => {
    expect(escapeXml(`<a href="x">&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;");
  });
});

describe("assetFileName", () => {
  it("names downloads after the partner and the asset", () => {
    expect(assetFileName("the-daily-grind-ab2c", "sticker", "pdf")).toBe("glowupp-the-daily-grind-ab2c-counter-card.pdf");
  });
});
