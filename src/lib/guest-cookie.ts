/**
 * Just the cookie name, in its own file with zero other imports —
 * src/proxy.ts (Edge runtime) needs it but cannot import src/lib/guest.ts
 * directly, since that file pulls in Prisma's Node-only pg driver.
 */
export const GUEST_COOKIE = "glowupp_guest_id";
