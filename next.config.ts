import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundles only the files the production server actually needs (a
  // pruned node_modules + server code) into .next/standalone — keeps the
  // Docker image lean instead of shipping the full dev node_modules.
  output: "standalone",
  experimental: {
    serverActions: {
      // Default is 1MB. Project photo uploads are proxied through a
      // Server Action (src/lib/actions/photos.ts) rather than a
      // direct-to-storage signed URL — see docs/BACKEND_ARCHITECTURE.md §15
      // for why. 12MB covers a 10MB photo plus multipart overhead.
      bodySizeLimit: "12mb",
    },
  },
  // Phase 12 security review: safe, low-risk headers that need no
  // per-resource tuning. A Content-Security-Policy is deliberately not
  // included here — it needs to be built against every real external
  // origin this app loads from (Supabase, kie.ai-hosted images, etc.) and
  // tested carefully, not bolted on during a review pass.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
