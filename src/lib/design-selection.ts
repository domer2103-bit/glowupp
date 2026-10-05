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
