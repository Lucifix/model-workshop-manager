import { beforeAll, describe, expect, it, vi } from "vitest";

// session.server.ts reads SESSION_SECRET at module scope, so it has to be set
// before the dynamic import below — the real server refuses to boot without it
// (see server/app.ts).
process.env.SESSION_SECRET = "test-secret-for-session-signing";

let SESSION_MAX_AGE_MS: number;
let isSessionAuthenticated: (cookieHeader?: string | null) => Promise<boolean>;
let sessionStorage: typeof import("./session.server.js").sessionStorage;

beforeAll(async () => {
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

describe("isSessionAuthenticated", () => {
  it("accepts a freshly issued session", async () => {
    const cookie = await cookieFor({
      authenticated: true,
      username: "alice",
      expiresAt: Date.now() + SESSION_MAX_AGE_MS,
    });
    expect(await isSessionAuthenticated(cookie)).toBe(true);
  });

  it("rejects a session whose expiry has passed", async () => {
    const cookie = await cookieFor({
      authenticated: true,
      username: "alice",
      expiresAt: Date.now() - 1,
    });
    expect(await isSessionAuthenticated(cookie)).toBe(false);
  });

  // The cookie itself never expires — React Router signs the payload but puts
  // maxAge only in the Set-Cookie attribute, which a captured cookie value
  // simply ignores. This is the case that proves the expiry is enforced
  // server-side rather than left to the browser.
  it("rejects a still-valid-looking cookie once the clock passes its expiry", async () => {
    const cookie = await cookieFor({
      authenticated: true,
      username: "alice",
      expiresAt: Date.now() + SESSION_MAX_AGE_MS,
    });
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
    const cookie = await cookieFor({
      authenticated: true,
      username: "alice",
      expiresAt: "9999999999999",
    });
    expect(await isSessionAuthenticated(cookie)).toBe(false);
  });

  it("rejects an unauthenticated session even with a valid expiry", async () => {
    const cookie = await cookieFor({
      authenticated: false,
      username: "alice",
      expiresAt: Date.now() + SESSION_MAX_AGE_MS,
    });
    expect(await isSessionAuthenticated(cookie)).toBe(false);
  });

  it("rejects a missing or tampered cookie", async () => {
    expect(await isSessionAuthenticated(undefined)).toBe(false);
    expect(await isSessionAuthenticated(null)).toBe(false);
    expect(await isSessionAuthenticated("")).toBe(false);

    const cookie = await cookieFor({
      authenticated: true,
      username: "alice",
      expiresAt: Date.now() + SESSION_MAX_AGE_MS,
    });
    // Flip the last character of the signature — unsign() must reject it.
    const tampered = cookie.slice(0, -1) + (cookie.endsWith("A") ? "B" : "A");
    expect(await isSessionAuthenticated(tampered)).toBe(false);
  });
});
