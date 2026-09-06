import { timingSafeEqual } from "node:crypto";

/**
 * Single-user credential check against env-configured values. This app is
 * explicitly single-user by design — a full users table would be
 * over-engineering. Both AUTH_USERNAME and AUTH_PASSWORD must be set for the
 * server to accept any login at all — see server/app.ts, which refuses to
 * boot without them.
 */
export function checkCredentials(username: string, password: string): boolean {
  const expectedUsername = process.env.AUTH_USERNAME ?? "";
  const expectedPassword = process.env.AUTH_PASSWORD ?? "";
  if (!expectedUsername || !expectedPassword) {
    return false;
  }
  return safeEqual(username, expectedUsername) && safeEqual(password, expectedPassword);
}

/** Constant-time string comparison — avoids leaking length/content via timing. */
function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  // timingSafeEqual throws on mismatched lengths, so pad to a fixed size first
  // rather than short-circuiting on length (which would itself leak timing).
  const len = Math.max(aBuf.length, bBuf.length, 32);
  const aPadded = Buffer.alloc(len);
  const bPadded = Buffer.alloc(len);
  aBuf.copy(aPadded);
  bBuf.copy(bPadded);
  return timingSafeEqual(aPadded, bPadded) && aBuf.length === bBuf.length;
}

/** Paths reachable without a session — keep this list minimal and explicit. */
export const PUBLIC_PATHS = new Set(["/api/health", "/api/auth/login", "/api/auth/me"]);

/**
 * Only /api/* and /uploads/* are guarded server-side — that's the entire
 * surface the old standalone Fastify API ever served. The React Router
 * document/assets (root.tsx and everything under /assets/*) are served
 * unguarded here, exactly as nginx served the old SPA shell unguarded — the
 * client-side auth gate in app/root.tsx (mirroring the old App.tsx) decides
 * whether to render the app or the login screen. New API/upload routes are
 * protected automatically; new UI routes are not server-gated by design.
 */
export function isGuardedPath(path: string): boolean {
  return path.startsWith("/api/") || path.startsWith("/uploads/");
}

export function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.has(path);
}
