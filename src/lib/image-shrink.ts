/**
 * Shrinks a photo in the browser before it is uploaded.
 *
 * Phone photos are 3-10 MB, and photos go to the server in one request (a
 * Server Action), so on a weak mobile connection the upload can take longer
 * than the connection survives and fails ("aborted"). Resizing the long edge
 * to 2048 px and re-encoding as JPEG makes a typical photo a few hundred KB —
 * plenty for the AI redesign and for quotes — and uploads in seconds.
 *
 * Browser-only. Every failure path returns the ORIGINAL file, so shrinking can
 * make an upload faster but can never make it fail or lose a photo.
 */

export const SHRINK_MAX_EDGE = 2048;
export const SHRINK_JPEG_QUALITY = 0.85;
/** A file already this small, and within the size limit, is left exactly as it is. */
export const SHRINK_SKIP_BYTES = 600 * 1024;

const SHRINKABLE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/** Output size that fits the long edge to `maxEdge`, keeping the aspect ratio and never enlarging. */
export function planShrink(width: number, height: number, maxEdge: number = SHRINK_MAX_EDGE): { width: number; height: number; scaled: boolean } {
  const longEdge = Math.max(width, height);
  if (!(longEdge > maxEdge)) return { width, height, scaled: false };
  const scale = maxEdge / longEdge;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), scaled: true };
}

/** Whether to even try: an image type we can re-encode, and not already small. */
export function shouldAttemptShrink(file: { type: string; size: number }): boolean {
  return SHRINKABLE_TYPES.includes(file.type.toLowerCase()) && file.size > SHRINK_SKIP_BYTES;
}

/** "IMG_1234.HEIC" -> "IMG_1234.jpg" */
export function jpegName(originalName: string): string {
  const base = originalName.replace(/\.[^./\\]+$/, "");
  return `${base || "photo"}.jpg`;
}

/** What decoding and re-encoding needs from the browser — injected so the logic is testable without one. */
export interface ImageEngine {
  /** Decodes the file with its camera rotation (EXIF) applied; throws if the browser cannot read it. */
  decode(file: File): Promise<{ width: number; height: number; encode(width: number, height: number, quality: number): Promise<Blob | null>; close(): void }>;
}

export const browserImageEngine: ImageEngine = {
  async decode(file) {
    let source: ImageBitmap | HTMLImageElement;
    let width: number;
    let height: number;
    let cleanup = () => {};
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      source = bitmap;
      width = bitmap.width;
      height = bitmap.height;
      cleanup = () => bitmap.close();
    } catch {
      // Older browsers: an <img> applies the camera rotation by itself.
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      try {
        await img.decode();
      } catch (err) {
        URL.revokeObjectURL(url);
        throw err;
      }
      source = img;
      width = img.naturalWidth;
      height = img.naturalHeight;
      cleanup = () => URL.revokeObjectURL(url);
    }
    return {
      width,
      height,
      close: cleanup,
      encode(w, h, quality) {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return Promise.resolve(null);
        ctx.fillStyle = "#ffffff"; // JPEG has no transparency
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(source, 0, 0, w, h);
        return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      },
    };
  },
};

export async function shrinkImageFile(file: File, engine: ImageEngine = browserImageEngine): Promise<File> {
  if (!shouldAttemptShrink(file)) return file;
  try {
    const image = await engine.decode(file);
    try {
      const plan = planShrink(image.width, image.height);
      const blob = await image.encode(plan.width, plan.height, SHRINK_JPEG_QUALITY);
      // Keep the original if encoding failed or, oddly, did not make it smaller (unless a HEIC was converted, which is worth keeping as JPEG).
      if (!blob || blob.size === 0) return file;
      const isHeic = /hei[cf]/i.test(file.type);
      if (blob.size >= file.size && !isHeic) return file;
      return new File([blob], jpegName(file.name), { type: "image/jpeg", lastModified: file.lastModified });
    } finally {
      image.close();
    }
  } catch {
    return file;
  }
}

/** Replaces every File in the named form fields with its shrunk version, keeping order. Other fields are untouched. */
export async function shrinkFormDataFiles(formData: FormData, fieldNames: string[], engine: ImageEngine = browserImageEngine): Promise<void> {
  for (const name of fieldNames) {
    const files = formData.getAll(name);
    if (files.length === 0 || !files.some((f) => f instanceof File)) continue;
    const shrunk = await Promise.all(files.map((f) => (f instanceof File ? shrinkImageFile(f, engine) : Promise.resolve(f))));
    formData.delete(name);
    for (const f of shrunk) formData.append(name, f);
  }
}
