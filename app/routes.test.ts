import type { RouteConfigEntry } from "@react-router/dev/routes";
import { describe, expect, it } from "vitest";
import routes from "./routes.js";
import { middleware as protectedMiddleware } from "./routes/api.protected.js";

const PROTECTED_LAYOUT_FILE = "routes/api.protected.ts";

// The exhaustive list of API paths allowed to skip auth — anything else
// under api/* must be nested under the protected layout. Keep this in sync
// with routes.ts's "Public API routes" section; a mismatch fails the test
// below rather than silently shipping an unauthenticated route.
const PUBLIC_API_PATHS = new Set(["api/health", "api/auth/login", "api/auth/me", "api/auth/setup"]);

function collectApiRoutes(
  entries: RouteConfigEntry[],
  underProtectedLayout: boolean,
): { path: string; protected: boolean }[] {
  return entries.flatMap((entry) => {
    const isProtectedLayout = entry.file === PROTECTED_LAYOUT_FILE;
    const nowProtected = underProtectedLayout || isProtectedLayout;
    const self = entry.path?.startsWith("api/")
      ? [{ path: entry.path, protected: nowProtected }]
      : [];
    const children = entry.children ? collectApiRoutes(entry.children, nowProtected) : [];
    return [...self, ...children];
  });
}

describe("API route auth coverage", () => {
  const apiRoutes = collectApiRoutes(routes, false);

  it("finds more than a handful of API routes (sanity check the walk works)", () => {
    expect(apiRoutes.length).toBeGreaterThan(30);
  });

  it("nests every API route under the protected layout, except the declared public ones", () => {
    for (const { path, protected: isProtected } of apiRoutes) {
      const shouldBePublic = PUBLIC_API_PATHS.has(path);
      expect(isProtected, `expected "${path}" to be protected`).toBe(!shouldBePublic);
    }
  });

  it("doesn't declare a public path that no longer exists as a route", () => {
    const allPaths = new Set(apiRoutes.map((r) => r.path));
    for (const publicPath of PUBLIC_API_PATHS) {
      expect(allPaths.has(publicPath), `"${publicPath}" is not a route in routes.ts`).toBe(true);
    }
  });

  it("keeps the protected layout's middleware non-empty", () => {
    // A layout with no middleware would make every route above pass this
    // whole test suite while enforcing nothing at runtime.
    expect(protectedMiddleware.length).toBeGreaterThan(0);
  });
});
