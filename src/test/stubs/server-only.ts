// Test-only stub for the "server-only" package. The real package always
// throws when imported outside Next.js's own bundler (Next swaps it for a
// no-op via a build-time "react-server" export condition that Vitest has
// no equivalent of) — this alias (see vitest.config.mts) gives Vitest the
// same no-op behavior so server-only modules with otherwise-pure logic
// (e.g. src/lib/rate-limit.ts) can be unit tested directly.
export {};
