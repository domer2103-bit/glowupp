/**
 * Pure helpers for the "choose a style, then match the rest of my photos"
 * flow. A batch generates one concept per style from a single photo; once
 * the homeowner picks one (selectedByUser), the other styles are hidden and
 * their remaining photos are designed to match the pick. Hidden concepts are
 * never deleted — the version history and per-project cap still count them.
 */

export interface SelectableConcept {
  id: string;
  styleKey: string | null;
  selectedByUser: boolean;
  status: string;
  sourcePhotoId: string;
}

/** Concepts made by "change this design" start their description with this, so they can be told apart from fresh style options. */
export const REFINEMENT_PREFIX = "Refinement of";

export function isRefinement(concept: { description?: string | null }): boolean {
  return (concept.description ?? "").startsWith(REFINEMENT_PREFIX);
}

/** The photo the style options were made from: the source of the earliest concept. */
export function batchPhotoId(concepts: { sourcePhotoId: string; version: number }[]): string | undefined {
  return [...concepts].sort((a, b) => a.version - b.version)[0]?.sourcePhotoId;
}

type OptionConcept = SelectableConcept & { version: number; description?: string | null };

/**
 * The style options to pick between: one card per style, made from the first photo.
 * Refinements and other-angle designs are left out. When a style was made more than once
 * (a retry after a failure) the newest usable one wins; a style that only ever failed still
 * shows, so it can be retried. Ordered by when each style was first made.
 */
export function styleOptions<T extends OptionConcept>(concepts: T[]): T[] {
  const photoId = batchPhotoId(concepts);
  const byStyle = new Map<string, T[]>();
  for (const c of [...concepts].sort((a, b) => a.version - b.version)) {
    if (c.sourcePhotoId !== photoId || isRefinement(c)) continue;
    const key = c.styleKey ?? c.id;
    byStyle.set(key, [...(byStyle.get(key) ?? []), c]);
  }
  return [...byStyle.values()].map((group) => {
    const usable = group.filter((c) => c.status !== "FAILED");
    return (usable.length > 0 ? usable : group).at(-1)!;
  });
}

/**
 * Everything that belongs to the chosen design: its earlier versions (same style, same photo, so
 * "go back to this one" is possible) and the same style applied to the other angles.
 */
export function chosenDesignGroup<T extends OptionConcept>(concepts: T[], chosen: T): { versions: T[]; angles: T[] } {
  const sameStyle = concepts.filter((c) => c.id !== chosen.id && chosen.styleKey !== null && c.styleKey === chosen.styleKey);
  return {
    versions: sameStyle.filter((c) => c.sourcePhotoId === chosen.sourcePhotoId && c.status === "COMPLETE"),
    angles: sameStyle.filter((c) => c.sourcePhotoId !== chosen.sourcePhotoId),
  };
}

export function getChosenConcept<T extends SelectableConcept>(concepts: T[]): T | undefined {
  return concepts.find((c) => c.selectedByUser);
}

/**
 * Concepts to display. With no pick yet — or when the homeowner asks to see
 * every option again — that's all of them. Once a style is picked, only that
 * style's concepts remain (the pick itself, its refinements, and the same
 * style applied to other photos); the rejected styles are hidden.
 */
export function conceptsToShow<T extends SelectableConcept>(concepts: T[], opts?: { showAll?: boolean }): T[] {
  const chosen = getChosenConcept(concepts);
  if (!chosen || opts?.showAll) return concepts;
  return concepts.filter((c) => c.id === chosen.id || (chosen.styleKey !== null && c.styleKey === chosen.styleKey));
}

/** Photos that don't yet have a (non-failed) concept in the chosen style — the ones "design my other photos" would cover. */
export function photosNeedingDesign<P extends { id: string }, C extends SelectableConcept>(photos: P[], concepts: C[], chosen: C): P[] {
  return photos.filter(
    (photo) =>
      photo.id !== chosen.sourcePhotoId &&
      !concepts.some((c) => c.sourcePhotoId === photo.id && c.status !== "FAILED" && c.styleKey === chosen.styleKey)
  );
}
