/**
 * Provider-independent image generation abstraction (Phase 5 of the
 * brief). Nothing outside `src/lib/image-providers/` and
 * `src/lib/design-generation.ts` should know which provider is behind
 * this interface, or which underlying model — that's the whole point:
 * swapping kie.ai for something else later should mean writing one new
 * file that implements this interface, not touching call sites.
 *
 * All three methods return a final, ready-to-download image URL —
 * whatever async job/poll mechanics a given provider needs (kie.ai's
 * create-task-then-poll pattern, for instance) are hidden inside the
 * provider implementation, not leaked into this interface. A
 * hypothetical synchronous provider would just return immediately.
 */

export interface GenerateDesignInput {
  /** A URL the provider's servers can fetch the source photo from (e.g. a Supabase signed URL). Not our permanent storage path. */
  sourceImageUrl: string;
  prompt: string;
  aspectRatio?: string;
}

export interface EditDesignInput {
  /** The previously generated design being refined — this, not the original photo, is what the provider edits. */
  previousImageUrl: string;
  prompt: string;
  aspectRatio?: string;
}

export interface GenerateDesignResult {
  /** Temporary, provider-hosted URL — callers must download and persist this themselves; providers do not guarantee long-term availability. */
  imageUrl: string;
  provider: string;
  model: string;
  /** Raw provider response, kept for debugging/traceability, never stored as-is in the database. */
  raw?: unknown;
}

export interface ImageGenerationProvider {
  readonly providerId: string;

  /** Source = the homeowner's original photo. The primary "turn this photo into a design" operation. */
  generateDesign(input: GenerateDesignInput): Promise<GenerateDesignResult>;

  /** Source = the homeowner's original photo again, with a new or varied prompt — a fresh attempt, not a refinement of a prior result. */
  regenerateDesign(input: GenerateDesignInput): Promise<GenerateDesignResult>;

  /** Source = a previously generated design (not the original photo) — refines that specific result further. */
  editDesign(input: EditDesignInput): Promise<GenerateDesignResult>;
}
