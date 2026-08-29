import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { resolve } from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./db/client.js";

import { manufacturerRoutes } from "./routes/manufacturers.js";
import { paintRoutes } from "./routes/paints.js";
import { modelRoutes } from "./routes/models.js";
import { inventoryRoutes } from "./routes/inventory.js";
import { projectRoutes } from "./routes/projects.js";
import { shoppingListRoutes } from "./routes/shoppingList.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { importRoutes } from "./routes/import.js";
import { catalogRoutes } from "./routes/catalog.js";

const PORT = Number(process.env.PORT ?? 3001);
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./data/uploads";

const app = Fastify({ logger: true });

// Idempotent — safe to run on every boot. Ensures a fresh deployment (empty
// volume, no tables yet) works without a separate manual migration step.
migrate(db, { migrationsFolder: "./src/db/migrations" });
app.log.info("Database migrations applied.");

await app.register(cors, { origin: true });
await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024 } });
await app.register(fastifyStatic, {
  root: resolve(UPLOAD_DIR),
  prefix: "/uploads/",
});

app.get("/api/health", async () => ({ status: "ok" }));

await app.register(manufacturerRoutes);
await app.register(paintRoutes);
await app.register(modelRoutes);
await app.register(inventoryRoutes);
await app.register(projectRoutes);
await app.register(shoppingListRoutes);
await app.register(dashboardRoutes);
await app.register(importRoutes);
await app.register(catalogRoutes);

app.listen({ port: PORT, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
