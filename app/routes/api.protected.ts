import type { MiddlewareFunction } from "react-router";
import { isSessionAuthenticated } from "../lib/session.server";

/**
 * Pathless layout route — see routes.ts. Every API route that requires a
 * logged-in session is nested as a child of this route, so protection is a
 * property of the route tree rather than of a path string somewhere else
 * matching that route's URL.
 *
 * This replaces a global Express middleware that re-matched each request's
 * path against "/api/" and an allow-list of exceptions before React Router
 * ever saw it — two separate systems that had to independently agree on what
 * a path meant, which is exactly how a previous incident happened
 * (React Router matches routes case-insensitively; the Express guard's
 * startsWith("/api/") didn't, so /API/models skipped the guard and still
 * reached the loader). Nesting the check here means there is only one system
 * deciding both "does this path match a route" and "is that route
 * protected": React Router's own route matching. A new route added to
 * routes.ts without being nested under this layout is unauthenticated by
 * construction — a visible choice in routes.ts, not a silent gap in a
 * separate function nobody remembers to update.
 */
export const middleware: MiddlewareFunction[] = [
  async ({ request }) => {
    const authenticated = await isSessionAuthenticated(request.headers.get("Cookie"));
    if (!authenticated) {
      throw new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
];
