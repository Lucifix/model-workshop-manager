import { createRequestHandler } from "@react-router/express";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { isGuardedPath, isPublicPath } from "../app/lib/auth.server";
import { isSessionAuthenticated } from "../app/lib/session.server";
import { UPLOAD_DIR } from "../app/lib/upload.server";
import { runMigrations } from "../app/db/migrate.server";

// Fail closed: refuse to boot rather than silently serve an unauthenticated
// API. All three must be explicitly configured — see .env.example.
for (const name of ["AUTH_USERNAME", "AUTH_PASSWORD", "SESSION_SECRET"]) {
  if (!process.env[name]) {
    console.error(
      `Missing required env var ${name}. See .env.example — this app requires login to be configured.`,
    );
    process.exit(1);
  }
}

// Idempotent — safe to run on every boot. Ensures a fresh deployment (empty
// volume, no tables yet) works without a separate manual migration step.
runMigrations();
console.log("Database migrations applied.");

export const app = express();

// The old nginx reverse proxy set client_max_body_size 50m (a full paint-catalog
// JSON import or a decent-resolution box photo/instruction PDF upload exceeds
// the 1m default) — reject oversized bodies up front rather than letting the
// server buffer them into memory.
const MAX_BODY_BYTES = 50 * 1024 * 1024;
app.use((req, res, next) => {
  const contentLength = Number(req.headers["content-length"]);
  if (contentLength > MAX_BODY_BYTES) {
    return res.status(413).json({ error: "payload_too_large" });
  }
  return next();
});

// Global auth guard — mirrors the old Fastify onRequest hook, but scoped to
// only the two prefixes the old standalone API ever served (/api/*,
// /uploads/*). The React Router document/assets are served unguarded here,
// exactly as nginx served the old SPA shell unguarded — app/root.tsx's
// client-side auth gate decides whether to render the app or the login
// screen. New /api or /uploads routes are protected automatically.
app.use(async (req, res, next) => {
  if (!isGuardedPath(req.path) || isPublicPath(req.path)) {
    return next();
  }
  const authenticated = await isSessionAuthenticated(req.headers.cookie);
  if (!authenticated) {
    return res.status(401).json({ error: "unauthenticated" });
  }
  return next();
});

// No built-in RR7/Express equivalent to @fastify/rate-limit — scoped to the
// login route only, matching the old 5/min limit.
app.use(
  "/api/auth/login",
  rateLimit({ windowMs: 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false }),
);

// No favicon.ico file is shipped (favicon.svg is linked in app/root.tsx) —
// short-circuit browsers' automatic probe so it doesn't fall through to the
// React Router document handler and log as a routing error.
app.get("/favicon.ico", (_req, res) => res.status(204).end());

// Uploaded files live outside the build output on a runtime-configurable
// directory (a Docker volume in production) — served here, ahead of the
// React Router catch-all, exactly like @fastify/static was registered
// alongside the old Fastify app.
app.use("/uploads", express.static(UPLOAD_DIR));

app.use(
  createRequestHandler({
    build: () => import("virtual:react-router/server-build"),
  }),
);
