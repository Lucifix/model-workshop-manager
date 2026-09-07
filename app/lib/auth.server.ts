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

/**
 * /uploads/* is served by express.static in server/app.ts, entirely outside
 * React Router, so it can't be gated by route-tree middleware the way
 * /api/* is (see app/routes/api.protected.ts) — it needs this standalone
 * check instead. Every uploaded file requires a session; there is no public
 * exception here the way there is for a handful of /api/* routes.
 *
 * Matched case-insensitively even though express.static's filesystem lookup
 * is case-sensitive: Express's own mount-path matching (the "/uploads"
 * prefix server/app.ts registers express.static under) is not case-sensitive
 * by default, so a case-sensitive check here could still let a
 * case-differing request through to a static lookup that succeeds anyway.
 */
export function isUploadPath(path: string): boolean {
  return path.toLowerCase().startsWith("/uploads/");
}
