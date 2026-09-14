import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

// session.server.ts reads SESSION_SECRET at module scope, and (since it now
// checks passwordChangedAt against the credential row) client.server.ts
// reads DATABASE_URL at module scope too — both have to be set before the
// dynamic imports below, on a fresh isolated DB rather than the dev one.
process.env.SESSION_SECRET = "test-secret-for-session-signing";
process.env.DATABASE_URL = join(mkdtempSync(join(tmpdir(), "workshop-session-test-")), "test.db");

const REAL_PASSWORD_CHANGED_AT = "2026-01-01T00:00:00.000Z";

let SESSION_MAX_AGE_MS: number;
let isSessionAuthenticated: (cookieHeader?: string | null) => Promise<boolean>;
let sessionStorage: typeof import("./session.server.js").sessionStorage;

beforeAll(async () => {
  const { runMigrations } = await import("../db/migrate.server.js");
  runMigrations();

  const { db } = await import("../db/client.server.js");
  const { authCredential } = await import("../db/schema.js");
  db.insert(authCredential)
    .values({
      username: "alice",
      passwordHash: "scrypt:unused:unused",
      passwordChangedAt: REAL_PASSWORD_CHANGED_AT,
    })
    .run();

  const mod = await import("./session.server.js");
  SESSION_MAX_AGE_MS = mod.SESSION_MAX_AGE_MS;
  isSessionAuthenticated = mod.isSessionAuthenticated;
  sessionStorage = mod.sessionStorage;
});

/** Builds a real signed cookie header, the way the login route would. */
async function cookieFor(data: Record<string, unknown>): Promise<string> {
  const session = await sessionStorage.getSession();
  for (const [key, value] of Object.entries(data)) {
    session.set(key as never, value as never);
  }
  const setCookie = await sessionStorage.commitSession(session);
  return setCookie.split(";")[0]!;
}

/** A cookie shaped exactly like a real login's, so tests only need to
 * override the one field they're exercising. */
function validCookie(overrides: Record<string, unknown> = {}) {
  return cookieFor({
    authenticated: true,
    username: "alice",
    expiresAt: Date.now() + SESSION_MAX_AGE_MS,
    passwordChangedAt: REAL_PASSWORD_CHANGED_AT,
    ...overrides,
  });
}

describe("isSessionAuthenticated", () => {
  it("accepts a freshly issued session", async () => {
    expect(await isSessionAuthenticated(await validCookie())).toBe(true);
  });

  it("rejects a session whose expiry has passed", async () => {
    const cookie = await validCookie({ expiresAt: Date.now() - 1 });
    expect(await isSessionAuthenticated(cookie)).toBe(false);
  });

  // The cookie itself never expires — React Router signs the payload but puts
  // maxAge only in the Set-Cookie attribute, which a captured cookie value
  // simply ignores. This is the case that proves the expiry is enforced
  // server-side rather than left to the browser.
  it("rejects a still-valid-looking cookie once the clock passes its expiry", async () => {
    const cookie = await validCookie();
    expect(await isSessionAuthenticated(cookie)).toBe(true);

    vi.useFakeTimers();
    try {
      vi.setSystemTime(Date.now() + SESSION_MAX_AGE_MS + 1000);
      expect(await isSessionAuthenticated(cookie)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  // Pre-expiry cookies carry no expiresAt. Treating that shape as valid is
  // exactly the never-expiring session this check exists to remove, so it must
  // fail closed — at the cost of one extra sign-in after upgrading.
  it("rejects a legacy session with no expiresAt", async () => {
    const cookie = await cookieFor({ authenticated: true, username: "alice" });
    expect(await isSessionAuthenticated(cookie)).toBe(false);
  });

  it("rejects a non-numeric expiresAt", async () => {
    const cookie = await validCookie({ expiresAt: "9999999999999" });
    expect(await isSessionAuthenticated(cookie)).toBe(false);
  });

  it("rejects an unauthenticated session even with a valid expiry", async () => {
    const cookie = await validCookie({ authenticated: false });
    expect(await isSessionAuthenticated(cookie)).toBe(false);
  });

  // Same reasoning as the missing-expiresAt case above, for the field added
  // when password changes started invalidating other sessions: a cookie
  // issued before that existed carries no passwordChangedAt, and must fail
  // closed rather than be treated as still matching.
  it("rejects a session with no passwordChangedAt", async () => {
    const cookie = await cookieFor({
      authenticated: true,
      username: "alice",
      expiresAt: Date.now() + SESSION_MAX_AGE_MS,
    });
    expect(await isSessionAuthenticated(cookie)).toBe(false);
  });

  // This is the case that proves changing the password actually signs out
  // other sessions: the credential row's passwordChangedAt has moved on, so
  // a cookie issued before that no longer matches.
  it("rejects a session whose passwordChangedAt is stale", async () => {
    const cookie = await validCookie({ passwordChangedAt: "2020-01-01T00:00:00.000Z" });
    expect(await isSessionAuthenticated(cookie)).toBe(false);
  });

  it("rejects a missing or tampered cookie", async () => {
    expect(await isSessionAuthenticated(undefined)).toBe(false);
    expect(await isSessionAuthenticated(null)).toBe(false);
    expect(await isSessionAuthenticated("")).toBe(false);

    const cookie = await validCookie();
    // Flip the last character of the signature — unsign() must reject it.
    const tampered = cookie.slice(0, -1) + (cookie.endsWith("A") ? "B" : "A");
    expect(await isSessionAuthenticated(tampered)).toBe(false);
  });
});
