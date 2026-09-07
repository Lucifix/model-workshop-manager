import { describe, it, expect } from "vitest";
import { PUBLIC_PATHS, isGuardedPath, isPublicPath } from "./auth.server.js";

describe("isGuardedPath", () => {
  it("guards the two prefixes the API serves", () => {
    expect(isGuardedPath("/api/models")).toBe(true);
    expect(isGuardedPath("/uploads/projects/1/photo.jpg")).toBe(true);
  });

  it("leaves the document and asset routes unguarded", () => {
    expect(isGuardedPath("/")).toBe(false);
    expect(isGuardedPath("/models")).toBe(false);
    expect(isGuardedPath("/assets/root-abc123.js")).toBe(false);
    expect(isGuardedPath("/sw.js")).toBe(false);
  });

  // React Router matches routes case-insensitively, so /API/models reaches the
  // same loader as /api/models. Before this was normalized, that spelling
  // skipped the guard and exposed every API route unauthenticated.
  it("guards case-variant spellings of the guarded prefixes", () => {
    expect(isGuardedPath("/API/models")).toBe(true);
    expect(isGuardedPath("/Api/settings")).toBe(true);
    expect(isGuardedPath("/aPi/backup/x.tar.gz/download")).toBe(true);
    expect(isGuardedPath("/UPLOADS/projects/1/photo.jpg")).toBe(true);
  });
});

describe("isPublicPath", () => {
  it("allows exactly the pre-login routes", () => {
    expect(isPublicPath("/api/health")).toBe(true);
    expect(isPublicPath("/api/auth/login")).toBe(true);
    expect(isPublicPath("/api/auth/me")).toBe(true);
    expect(isPublicPath("/api/models")).toBe(false);
    expect(isPublicPath("/api/auth/logout")).toBe(false);
  });

  it("recognizes case-variant spellings, matching the guard", () => {
    expect(isPublicPath("/API/HEALTH")).toBe(true);
    expect(isPublicPath("/Api/Auth/Login")).toBe(true);
  });

  // The lookup lowercases its input, so an entry that isn't already lowercase
  // would be unreachable and silently fail closed.
  it("keeps every allow-list entry lowercase", () => {
    for (const path of PUBLIC_PATHS) {
      expect(path).toBe(path.toLowerCase());
    }
  });
});
