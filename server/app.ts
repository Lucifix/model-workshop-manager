import { createRequestHandler } from "@react-router/express";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { isUploadPath } from "../app/lib/auth.server";
import { BACKUP_UPLOAD_PATH, MAX_BACKUP_UPLOAD_BYTES } from "../app/lib/backupFile.server";
import { ensureCredential } from "../app/lib/credentials.server";
import { isSessionAuthenticated } from "../app/lib/session.server";
import { parseTrustProxy } from "../app/lib/trustProxy.server";
import { UPLOAD_DIR } from "../app/lib/upload.server";
import { runMigrations } from "../app/db/migrate.server";

// Idempotent — safe to run on every boot. Ensures a fresh deployment (empty
// volume, no tables yet) works without a separate manual migration step.
runMigrations();
console.log("Database migrations applied.");

// Migrates AUTH_USERNAME/AUTH_PASSWORD into the credential row on an
// existing deployment's first boot after upgrading; a no-op otherwise. See
// app/lib/credentials.server.ts.
await ensureCredential();

export const app = express();

// Off unless TRUST_PROXY says otherwise — see trustProxy.server.ts for why the
// safe default is the un-proxied one, and why `true` is refused. Set before
// the rate limiter below, which reads req.ip to decide whose budget a login
// attempt spends.
try {
  const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
  if (trustProxy !== null) {
    app.set("trust proxy", trustProxy);
  }
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}

// The old nginx reverse proxy set client_max_body_size 50m (a full paint-catalog
// JSON import or a decent-resolution box photo/instruction PDF upload exceeds
// the 1m default) — reject oversized bodies up front rather than letting the
// server buffer them into memory.
//
// Backup restore is the one route this cap can't speak for: an archive holds
// the database *and* every photo, so 50 MB rejects most real backups. It
// carries its own, larger limit (enforced in api.backup.upload.ts against the
// parsed file rather than a client-supplied header), and both sides read that
// limit from the same constant so they can't drift apart again.
const MAX_BODY_BYTES = 50 * 1024 * 1024;
app.use((req, res, next) => {
  // A chunked request has no Content-Length by design (that's what makes it
  // chunked) — Number(undefined) is NaN, and `NaN > limit` is always false,
  // so it would otherwise bypass the cap below entirely. A request with
  // neither header (a bodyless DELETE/PATCH, the common case) has nothing to
  // cap and is left alone.
  if (req.headers["transfer-encoding"]) {
    return res.status(411).json({ error: "length_required" });
  }

  const contentLength = Number(req.headers["content-length"]);
  if (Number.isNaN(contentLength)) {
    return next();
  }

  const limit =
    req.path.toLowerCase() === BACKUP_UPLOAD_PATH ? MAX_BACKUP_UPLOAD_BYTES : MAX_BODY_BYTES;
  if (contentLength > limit) {
    return res.status(413).json({ error: "payload_too_large" });
  }
  return next();
});

// /uploads guard — /api/* auth now lives in the route tree (see
// app/routes/api.protected.ts), because React Router can enforce it as part
// of matching the request to a route instead of a separate system trying to
// recognize the same path a second time. /uploads/* can't join that: it's
// served by express.static below, entirely outside React Router, so it still
// needs its own check here, ahead of the static handler.
//
// Matched case-insensitively even though express.static's underlying
// filesystem lookup is case-sensitive — Express's own path-to-regexp mount
// matching (the "/uploads" prefix on app.use below) is NOT case-sensitive by
// default, so a case-sensitive guard here could still hand an unauthenticated
// request through to a case-differing request that express.static goes on to
// resolve successfully against an on-disk file.
app.use(async (req, res, next) => {
  if (!isUploadPath(req.path)) {
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
// Defense in depth behind upload.server.ts's content-type allow-list: even if
// a file with an executable extension reaches the disk, these headers stop the
// browser sniffing it into script running on this origin.
app.use(
  "/uploads",
  express.static(UPLOAD_DIR, {
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    },
  }),
);

app.use(
  createRequestHandler({
    build: () => import("virtual:react-router/server-build"),
  }),
);
