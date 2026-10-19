import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ClientGuidePage from "./page";
import { CLIENT_GUIDE_POSTER, CLIENT_GUIDE_VIDEO } from "@/components/ClientGuideVideo";
import { existsSync } from "node:fs";
import { join } from "node:path";

const html = renderToStaticMarkup(<ClientGuidePage />);

describe("/client-guide page", () => {
  it("shows the video without autoplay, with a poster, and the five steps", () => {
    expect(html).toContain(CLIENT_GUIDE_VIDEO);
    expect(html).toContain(CLIENT_GUIDE_POSTER);
    expect(html).toContain('preload="none"');
    expect(html).not.toContain("autoPlay");
    for (const step of ["Scan or tap", "Add a photo", "See your space", "Send it over", "Get your estimate"]) expect(html).toContain(step);
  });

  it("the video and poster files exist in /public", () => {
    expect(existsSync(join(process.cwd(), "public", CLIENT_GUIDE_VIDEO))).toBe(true);
    expect(existsSync(join(process.cwd(), "public", CLIENT_GUIDE_POSTER))).toBe(true);
  });
});
