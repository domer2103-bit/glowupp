/**
 * Cost control for AI image generation (docs/BACKEND_ARCHITECTURE.md §11).
 *
 * Not enforced by a database column — the limit is checked in application
 * code at generation time (Phase 5/6) by counting existing `DesignConcept`
 * rows for the project. Keeping it as a constant here means it can be
 * tuned without a migration.
 */
export const GENERATION_LIMITS = {
  /** How many concepts get generated in the first batch for a project. */
  initialBatchSize: 3,
  /** Total design_concepts rows allowed per project (initial batch + regenerations). */
  maxPerProject: Number(process.env.MAX_DESIGN_GENERATIONS_PER_PROJECT ?? 9),
} as const;
