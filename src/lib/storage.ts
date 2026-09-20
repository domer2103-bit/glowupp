import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client, for Storage access only. Never exported to
 * anything a browser could import — this key bypasses every Storage/RLS
 * policy, which is exactly why uploads/downloads are proxied through
 * Server Actions rather than performed directly from the client (see
 * docs/BACKEND_ARCHITECTURE.md §15).
 */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export const PROJECT_PHOTOS_BUCKET = "project-photos";
export const ALLOWED_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"] as const;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10MB

export const GENERATED_DESIGNS_BUCKET = "generated-designs";

/** Stored paths are "<bucket>/<key>" so they're unambiguous even once more buckets exist (Phase 5 adds "generated-designs"). */
export function toStoragePath(bucket: string, key: string): string {
  return `${bucket}/${key}`;
}

function parseStoragePath(storagePath: string): { bucket: string; key: string } {
  const [bucket, ...rest] = storagePath.split("/");
  return { bucket, key: rest.join("/") };
}

export async function uploadPhoto(key: string, file: File): Promise<{ storagePath: string } | { error: string }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from(PROJECT_PHOTOS_BUCKET)
    .upload(key, bytes, { contentType: file.type, upsert: false });

  if (error) return { error: error.message };
  return { storagePath: toStoragePath(PROJECT_PHOTOS_BUCKET, key) };
}

export async function uploadGeneratedDesign(
  key: string,
  bytes: Uint8Array,
  contentType: string
): Promise<{ storagePath: string } | { error: string }> {
  const { error } = await supabaseAdmin.storage
    .from(GENERATED_DESIGNS_BUCKET)
    .upload(key, bytes, { contentType, upsert: false });

  if (error) return { error: error.message };
  return { storagePath: toStoragePath(GENERATED_DESIGNS_BUCKET, key) };
}

export async function deleteStorageObject(storagePath: string): Promise<void> {
  const { bucket, key } = parseStoragePath(storagePath);
  await supabaseAdmin.storage.from(bucket).remove([key]);
}

/** Short-lived signed URL for displaying a private photo — generated fresh on each render, never cached long-term. */
export async function getSignedPhotoUrl(storagePath: string, expiresInSeconds = 300): Promise<string | null> {
  const { bucket, key } = parseStoragePath(storagePath);
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(key, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}
