import { createCookieSessionStorage } from "react-router";
import { db } from "../db/client.server";
import { authCredential } from "../db/schema";

export interface SessionData {
  authenticated: boolean;
  username: string;
  /** Absolute expiry, epoch ms. See SESSION_MAX_AGE_MS. */
  expiresAt: number;
  /** Copy of auth_credential.passwordChangedAt at the moment this session was
   * issued — see isSessionAuthenticated for why. */
  passwordChangedAt: string;
}

const SESSION_SECRET = process.env.SESSION_SECRET!;

/**
 * One constant for both the cookie's `maxAge` attribute and the expiry stored
 * *inside* the signed payload — they must not drift, because only the latter
 * is enforced server-side (see isSessionAuthenticated).
 */
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Deviation from the old @fastify/secure-session cookie: that one encrypted
// the payload (libsodium secretbox); this only HMAC-signs it (tamper-proof,
// but the base64 payload is readable). Accepted deliberately — the only
// session content is { authenticated, username, expiresAt, passwordChangedAt },
// no secrets — see the migration plan doc.
export const sessionStorage = createCookieSessionStorage<SessionData>({
  cookie: {
    name: "workshop_session",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.SESSION_COOKIE_SECURE === "true",
    maxAge: SESSION_MAX_AGE_MS / 1000, // 30 days — single-user LAN app, favor convenience
    secrets: [SESSION_SECRET],
  },
});

/** Accepts a raw `Cookie` header value (from either a Web Request or a plain
 * Express req.headers.cookie) — session storage only needs the header string. */
export function getSession(cookieHeader?: string | null) {
  return sessionStorage.getSession(cookieHeader);
}

/**
 * The cookie's own `maxAge`/`Expires` is only an instruction to the browser —
 * React Router signs the payload but never puts an expiry inside it, so a
 * copy of the cookie value captured off the wire (the documented default
 * deployment is plain HTTP on a LAN) would otherwise stay valid forever, and
 * `destroySession` on logout could not revoke it. The expiry therefore lives
 * in the signed payload and is checked here, on the one path both guards go
 * through (server/app.ts's /uploads check and app/routes/api.protected.ts).
 *
 * A session missing `expiresAt` is rejected rather than trusted: that shape
 * predates this check, and treating it as unexpiring is exactly the bug being
 * fixed. The cost is that existing logins have to sign in once more.
 *
 * There is no session table to revoke a specific cookie from, so "sign out
 * everywhere" is instead implemented by comparing the cookie's
 * passwordChangedAt against the one live value in auth_credential (a single
 * lookup on a one-row table) — changing your password bumps that value, and
 * every other existing cookie stops matching immediately. A cookie issued
 * before this check existed carries no passwordChangedAt at all, which fails
 * the comparison the same way a missing expiresAt does — one more required
 * re-login after upgrading, not a silent bypass.
 */
export async function isSessionAuthenticated(cookieHeader?: string | null): Promise<boolean> {
  const session = await getSession(cookieHeader);
  if (session.get("authenticated") !== true) {
    return false;
  }
  const expiresAt = session.get("expiresAt");
  if (typeof expiresAt !== "number" || Date.now() >= expiresAt) {
    return false;
  }
  const credential = db.select().from(authCredential).get();
  return (
    credential !== undefined && session.get("passwordChangedAt") === credential.passwordChangedAt
  );
}
