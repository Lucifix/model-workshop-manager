import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import secureSession from "@fastify/secure-session";
import rateLimit from "@fastify/rate-limit";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./db/client.js";
import { isPublicPath } from "./lib/auth.js";

import { authRoutes } from "./routes/auth.js";
import { manufacturerRoutes } from "./routes/manufacturers.js";
import { paintRoutes } from "./routes/paints.js";
import { modelRoutes } from "./routes/models.js";
import { tagRoutes } from "./routes/tags.js";
import { inventoryRoutes } from "./routes/inventory.js";
import { projectRoutes } from "./routes/projects.js";
import { supplyRoutes } from "./routes/supplies.js";
import { shoppingListRoutes } from "./routes/shoppingList.js";
import { wishlistRoutes } from "./routes/wishlist.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { importRoutes } from "./routes/import.js";
import { catalogRoutes } from "./routes/catalog.js";
import { backupRoutes } from "./routes/backup.js";

const PORT = Number(process.env.PORT ?? 3001);
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./data/uploads";

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
const SESSION_SECRET = process.env.SESSION_SECRET!;

const app = Fastify({ logger: true });

// Idempotent — safe to run on every boot. Ensures a fresh deployment (empty
// volume, no tables yet) works without a separate manual migration step.
migrate(db, { migrationsFolder: "./src/db/migrations" });
app.log.info("Database migrations applied.");

await app.register(cors, { origin: true, credentials: true });
await app.register(rateLimit, { global: false });
await app.register(secureSession, {
  // Any-length secret is fine — SHA-256 always derives a valid 32-byte key.
  key: createHash("sha256").update(SESSION_SECRET).digest(),
  cookieName: "workshop_session",
  cookie: {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.SESSION_COOKIE_SECURE === "true",
    maxAge: 60 * 60 * 24 * 30, // 30 days — single-user LAN app, favor convenience
  },
});

// Global auth guard — everything is protected by default; PUBLIC_PATHS in
// lib/auth.ts is the only allow-list. New routes are guarded automatically.
app.addHook("onRequest", async (req, reply) => {
  const path = req.url.split("?")[0]!;
  if (isPublicPath(path)) {
    return;
  }
  if (req.session.get("authenticated") !== true) {
    reply.code(401).send({ error: "unauthenticated" });
  }
});

await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024 } });
await app.register(fastifyStatic, {
  root: resolve(UPLOAD_DIR),
  prefix: "/uploads/",
});

app.get("/api/health", async () => ({ status: "ok" }));

await app.register(authRoutes);
await app.register(manufacturerRoutes);
await app.register(paintRoutes);
await app.register(modelRoutes);
await app.register(tagRoutes);
await app.register(inventoryRoutes);
await app.register(projectRoutes);
await app.register(supplyRoutes);
await app.register(shoppingListRoutes);
await app.register(wishlistRoutes);
await app.register(dashboardRoutes);
await app.register(importRoutes);
await app.register(catalogRoutes);
await app.register(backupRoutes);

app.listen({ port: PORT, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
