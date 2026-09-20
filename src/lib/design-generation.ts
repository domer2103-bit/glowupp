import "server-only";
import { randomUUID } from "node:crypto";
import type { ProjectTypeDefinition } from "@/lib/project-types";
import { getSignedPhotoUrl, uploadGeneratedDesign } from "@/lib/storage";
import { getImageProvider, type GenerateDesignResult } from "@/lib/image-providers";

interface ProjectPromptContext {
  title: string;
  description: string | null;
}

/**
 * Turns the structured project profile — the same data Phase 3's manual
 * form and Phase 4's assistant both write to — into an image-editing
 * instruction. This is the "Design instructions" step of the brief's
 * workflow diagram (existing photo → project profile → design
 * instructions → image generation).
 *
 * `styleModifier` layers on a direction from src/lib/design-styles.ts for
 * batch generation; `changeRequest` layers on homeowner feedback text for
 * the "request changes" flow. Both optional and independent — a
 * regeneration can carry a style with no change request, an edit carries
 * a change request with no style.
 */
export function buildDesignPrompt(
  project: ProjectPromptContext,
  definition: ProjectTypeDefinition,
  requirementsData: Record<string, unknown>,
  options?: { styleModifier?: string; changeRequest?: string }
): string {
  const details: string[] = [];
  for (const field of definition.fields) {
    const value = requirementsData[field.key];
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) continue;
    const formatted = Array.isArray(value) ? value.join(", ") : String(value);
    details.push(`${field.label}: ${formatted}`);
  }

  const brief = details.length > 0 ? details.join("\n") : "(no specific preferences recorded yet — use good general taste for this style of project)";

  let prompt = `Redesign this ${definition.label.toLowerCase()} based on the brief below. Keep the room's fundamental geometry, camera angle, walls, windows, and ceiling exactly as shown in the source photo — only change finishes, materials, furniture, and fixtures as described. This must look like a photorealistic, physically plausible renovation of the SAME space, not a different room.

Project: "${project.title}"${project.description ? ` — ${project.description}` : ""}

Brief:
${brief}`;

  if (options?.styleModifier) prompt += `\n\n${options.styleModifier}`;
  if (options?.changeRequest) {
    prompt += `\n\nThe homeowner has asked for this specific change to the image you're editing: ${options.changeRequest}\nApply this change while keeping everything else about the existing design as it is.`;
  }

  return prompt;
}

export interface GeneratedDesignOutput {
  storagePath: string;
  provider: string;
  model: string;
}

/**
 * Runs one generation end-to-end against the active provider and persists
 * the result to our own storage. Does not touch the database — the
 * caller (a Server Action) owns creating/updating the DesignConcept row.
 *
 * `mode` selects which provider capability to use:
 * - "generate" / "regenerate": source is the homeowner's original photo.
 * - "edit": source is a previously generated design being refined —
 *   `sourceStoragePath` should be that concept's own storagePath, not the
 *   original photo, in this mode.
 */
export async function runDesignGeneration(params: {
  projectId: string;
  mode: "generate" | "regenerate" | "edit";
  sourceStoragePath: string;
  prompt: string;
}): Promise<GeneratedDesignOutput> {
  const sourceImageUrl = await getSignedPhotoUrl(params.sourceStoragePath, 600);
  if (!sourceImageUrl) throw new Error("Could not create a signed URL for the source image.");

  const provider = getImageProvider();
  let result: GenerateDesignResult;
  if (params.mode === "edit") {
    result = await provider.editDesign({ previousImageUrl: sourceImageUrl, prompt: params.prompt });
  } else if (params.mode === "regenerate") {
    result = await provider.regenerateDesign({ sourceImageUrl, prompt: params.prompt });
  } else {
    result = await provider.generateDesign({ sourceImageUrl, prompt: params.prompt });
  }

  const downloadRes = await fetch(result.imageUrl);
  if (!downloadRes.ok) throw new Error(`Failed to download generated image from provider (HTTP ${downloadRes.status}).`);
  const contentType = downloadRes.headers.get("content-type") ?? "image/png";
  const bytes = new Uint8Array(await downloadRes.arrayBuffer());

  const ext = contentType.includes("jpeg") ? "jpg" : contentType.includes("webp") ? "webp" : "png";
  const key = `${params.projectId}/${randomUUID()}.${ext}`;
  const uploadResult = await uploadGeneratedDesign(key, bytes, contentType);
  if ("error" in uploadResult) throw new Error(`Failed to store generated image: ${uploadResult.error}`);

  return { storagePath: uploadResult.storagePath, provider: result.provider, model: result.model };
}
