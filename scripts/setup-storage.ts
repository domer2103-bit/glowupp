import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10MB

async function ensureBucket(id: string) {
  const { data: existing } = await admin.storage.getBucket(id);
  if (existing) {
    console.log(`bucket "${id}" already exists`);
    return;
  }
  const { error } = await admin.storage.createBucket(id, {
    public: false,
    fileSizeLimit: MAX_PHOTO_BYTES,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
  });
  if (error) throw error;
  console.log(`created bucket "${id}"`);
}

async function main() {
  await ensureBucket("project-photos");
  // Generated designs are downloaded from the provider's temporary URL and
  // re-uploaded here for permanent storage — kie.ai's result URLs expire
  // (observed ~24h), ours don't.
  await ensureBucket("generated-designs");
}

main();
