import "server-only";
import type { ImageGenerationProvider } from "./types";
import { KieAiImageProvider } from "./kie-ai";

export type { ImageGenerationProvider, GenerateDesignInput, EditDesignInput, GenerateDesignResult } from "./types";

/**
 * The single place that decides which provider is live. Swapping providers
 * later means changing this function, not any call site — see
 * docs/BACKEND_ARCHITECTURE.md §17 for the Nano Banana Pro vs. Flux
 * Kontext Pro comparison that informed the current default.
 */
export function getImageProvider(): ImageGenerationProvider {
  return new KieAiImageProvider();
}
