import "server-only";
import { randomUUID } from "node:crypto";
import type { ProjectTypeDefinition } from "@/lib/project-types";
import { getSignedPhotoUrl, uploadGeneratedDesign } from "@/lib/storage";
import { imageSize } from "image-size";
import { getImageProvider, type GenerateDesignResult } from "@/lib/image-providers";
import { nearestAspectRatio } from "@/lib/aspect-ratio";

interface ProjectPromptContext {
  title: string;
  description: string | null;
}

/**
 * Appended to every redesign prompt. Image models drift on room geometry
 * unless told, explicitly and by name, what is fixed — "keep the geometry"
 * alone moved chimney breasts and windows. The carve-out ("unless asked")
 * is what lets a homeowner still request structural changes: the Brief or a
 * change request can override, and only for what they name.
 */
const STRUCTURE_LOCK =
  "Keep the structure of the space exactly as photographed: the same room shape and proportions, wall positions, ceiling height and lines, camera position, angle, field of view and perspective, and the same position, size and shape of every window, door and doorway, chimney breast or fireplace, alcove, radiator, staircase, built-in unit, boundary wall and roofline. Do not move, resize, add, remove or restyle any of these. Only change finishes, colours, materials, furniture, lighting, soft furnishings and decor. Change the structure only where the Brief or a requested change below explicitly asks for it, and then change only what was asked. The result must look like a photorealistic photo of the SAME space after renovation, not a different one.";

/** Used when a second image — the homeowner's approved design of the same space from another angle — is supplied as a style reference. */
const MATCH_APPROVED_DESIGN =
  "Two images are supplied. The FIRST is the photo to redesign. The SECOND is only a STYLE REFERENCE: the homeowner's approved design of the same space, shot from a different angle. Use the second image solely for its colour palette, wall colours, flooring, materials, finishes, fabrics, lighting style and overall mood. Do NOT copy anything else from it: not its layout, camera angle, windows, fireplace, furniture arrangement or objects. The output must show the FIRST photo's own room, with the first photo's own furniture and features in the same positions, restyled to match the approved scheme.";

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
  options?: { styleModifier?: string; changeRequest?: string; matchApprovedDesign?: boolean }
): string {
  const details: string[] = [];
  for (const field of definition.fields) {
    const value = requirementsData[field.key];
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) continue;
    const formatted = Array.isArray(value) ? value.join(", ") : String(value);
    details.push(`${field.label}: ${formatted}`);
  }

  const brief = details.length > 0 ? details.join("\n") : "(no specific preferences recorded yet — use good general taste for this style of project)";

  let prompt = `Redesign this ${definition.label.toLowerCase()} based on the brief below. This is an EDIT of the supplied photo, not a new picture. ${STRUCTURE_LOCK}

Project: "${project.title}"${project.description ? ` — ${project.description}` : ""}

Brief:
${brief}`;

  if (options?.matchApprovedDesign) {
    prompt += `\n\n${MATCH_APPROVED_DESIGN}`;
  } else if (options?.styleModifier) {
    prompt += `\n\n${options.styleModifier}`;
  }
  if (options?.changeRequest) {
    prompt += `\n\nThe homeowner has asked for this specific change to the image you're editing: ${options.changeRequest}\nApply this change while keeping everything else about the existing design as it is.`;
  }

  return prompt;
}

/**
 * The aspect ratio closest to the source image's own, so the output keeps the
 * photo's shape (see src/lib/aspect-ratio.ts). Best-effort: if the image
 * can't be fetched or measured (e.g. an unsupported format), generation just
 * proceeds without it, exactly as before.
 */
async function aspectRatioOf(imageUrl: string): Promise<string | undefined> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return undefined;
    const { width, height } = imageSize(new Uint8Array(await res.arrayBuffer()));
    return nearestAspectRatio(width, height);
  } catch {
    return undefined;
  }
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
  /** An approved design to match (see MATCH_APPROVED_DESIGN) — only used by providers that accept more than one input image. */
  referenceStoragePath?: string;
}): Promise<GeneratedDesignOutput> {
  const sourceImageUrl = await getSignedPhotoUrl(params.sourceStoragePath, 600);
  if (!sourceImageUrl) throw new Error("Could not create a signed URL for the source image.");

  let referenceImageUrls: string[] | undefined;
  if (params.referenceStoragePath) {
    const referenceUrl = await getSignedPhotoUrl(params.referenceStoragePath, 600);
    if (!referenceUrl) throw new Error("Could not create a signed URL for the reference design.");
    referenceImageUrls = [referenceUrl];
  }

  const aspectRatio = await aspectRatioOf(sourceImageUrl);

  const provider = getImageProvider();
  let result: GenerateDesignResult;
  if (params.mode === "edit") {
    result = await provider.editDesign({ previousImageUrl: sourceImageUrl, prompt: params.prompt, aspectRatio });
  } else if (params.mode === "regenerate") {
    result = await provider.regenerateDesign({ sourceImageUrl, prompt: params.prompt, aspectRatio });
  } else {
    result = await provider.generateDesign({ sourceImageUrl, prompt: params.prompt, aspectRatio, referenceImageUrls });
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
