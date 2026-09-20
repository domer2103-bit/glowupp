import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      // The real "server-only" package always throws outside Next.js's own
      // bundler (see src/test/stubs/server-only.ts) — stubbed here so
      // server-only-marked modules with otherwise-pure logic can be tested.
      "server-only": path.resolve(import.meta.dirname, "./src/test/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
