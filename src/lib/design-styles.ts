/**
 * Configurable style directions for batch design generation (Phase 6).
 * The brief's own example names ("Modern", "Warm", "Premium") are
 * explicitly not to be hard-coded as if they're the only ones — this
 * registry is the swappable, data-driven equivalent of
 * src/lib/project-types.ts: adding, removing, or rewording a style is a
 * one-entry change here, not a change to the generation pipeline itself
 * (src/lib/design-generation.ts, src/lib/actions/designs.ts never
 * reference a style by name).
 *
 * Kept as one shared list across all project types for now — these are
 * general aesthetic directions (not project-type-specific vocabulary), so
 * a single registry covers kitchens, bathrooms, driveways, etc. without
 * needing per-type variants yet. If a project type later needs its own
 * style set, this can become a Record<projectTypeKey, DesignStyle[]>
 * without changing anything that reads from it positionally.
 */
export interface DesignStyle {
  key: string;
  label: string;
  /** Appended to the base design-brief prompt to steer this concept's direction. */
  promptModifier: string;
}

export const DESIGN_STYLES: readonly DesignStyle[] = [
  {
    key: "contemporary",
    label: "Contemporary",
    promptModifier:
      "Style direction: contemporary — clean lines, a neutral palette, minimal ornamentation, current mainstream design trends.",
  },
  {
    key: "traditional",
    label: "Traditional",
    promptModifier:
      "Style direction: traditional — classic and timeless materials, warm and inviting details, enduring rather than trend-led.",
  },
  {
    key: "bold",
    label: "Bold",
    promptModifier:
      "Style direction: bold — a genuine statement look, richer colours or higher-contrast materials than a safe default choice, while staying tasteful and cohesive.",
  },
] as const;

export function getDesignStyle(key: string): DesignStyle | undefined {
  return DESIGN_STYLES.find((s) => s.key === key);
}
