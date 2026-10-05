/**
 * Ratios both kie.ai image models accept for `aspect_ratio`. Asking for the
 * one closest to the source photo keeps the output the same shape as the
 * photo — without it nano-banana-pro defaults to a square, which forces it
 * to re-frame a wide room shot and move the walls, windows and fixtures.
 */
const SUPPORTED_RATIOS: readonly { label: string; value: number }[] = [
  { label: "9:16", value: 9 / 16 },
  { label: "2:3", value: 2 / 3 },
  { label: "3:4", value: 3 / 4 },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
];

/** The supported ratio closest (on a log scale, so 2:1 and 1:2 are equally far from 1:1) to width:height, or undefined for unusable dimensions. */
export function nearestAspectRatio(width: number, height: number): string | undefined {
  if (!(width > 0) || !(height > 0)) return undefined;
  const target = Math.log(width / height);
  let best = SUPPORTED_RATIOS[0];
  for (const r of SUPPORTED_RATIOS) {
    if (Math.abs(Math.log(r.value) - target) < Math.abs(Math.log(best.value) - target)) best = r;
  }
  return best.label;
}
