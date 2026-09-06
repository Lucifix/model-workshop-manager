import { createCookieSessionStorage } from "react-router";

export interface SessionData {
  authenticated: boolean;
  username: string;
}

const SESSION_SECRET = process.env.SESSION_SECRET!;

// Deviation from the old @fastify/secure-session cookie: that one encrypted
// the payload (libsodium secretbox); this only HMAC-signs it (tamper-proof,
// but the base64 payload is readable). Accepted deliberately — the only
// session content is { authenticated, username }, no secrets — see the
// migration plan doc.
export const sessionStorage = createCookieSessionStorage<SessionData>({
  cookie: {
    name: "workshop_session",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.SESSION_COOKIE_SECURE === "true",
    maxAge: 60 * 60 * 24 * 30, // 30 days — single-user LAN app, favor convenience
    secrets: [SESSION_SECRET],
  },
});

/** Accepts a raw `Cookie` header value (from either a Web Request or a plain
 * Express req.headers.cookie) — session storage only needs the header string. */
export function getSession(cookieHeader?: string | null) {
  return sessionStorage.getSession(cookieHeader);
}

export async function isSessionAuthenticated(cookieHeader?: string | null): Promise<boolean> {
  const session = await getSession(cookieHeader);
  return session.get("authenticated") === true;
}
