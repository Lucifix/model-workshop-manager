import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { mkdirSync, createWriteStream, unlink } from "node:fs";
import { basename, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { db } from "../db/client.js";
import {
  projects,
  models,
  buildLogEntries,
  projectPhotos,
  projectPaints,
  paints,
} from "../db/schema.js";
import {
  projectCreateSchema,
  projectUpdateSchema,
  buildLogCreateSchema,
  projectPaintCreateSchema,
} from "../lib/schemas.js";
import { parseBody } from "../lib/validate.js";
import { resolveCoverPhotoUrls } from "../lib/coverPhotos.js";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./data/uploads";

export async function projectRoutes(app: FastifyInstance) {
  app.get("/api/projects", async (req) => {
    const { status } = req.query as Record<string, string | undefined>;
    let rows = db
      .select({ project: projects, model: models })
      .from(projects)
      .leftJoin(models, eq(projects.modelId, models.id))
      .all();
    if (status) rows = rows.filter((r) => r.project.status === status);

    const coverPhotoUrls = resolveCoverPhotoUrls(rows.map((r) => r.project));
    return rows.map((r) => ({ ...r, coverPhotoUrl: coverPhotoUrls.get(r.project.id) }));
  });

  app.post("/api/projects", async (req, reply) => {
    const body = parseBody(projectCreateSchema, req.body, reply);
    if (!body) return;
    const [row] = await db.insert(projects).values(body).returning();
    reply.code(201).send(row);
  });

  app.get("/api/projects/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const project = db.select().from(projects).where(eq(projects.id, id)).get();
    if (!project) return reply.code(404).send({ error: "not_found" });
    const model = db.select().from(models).where(eq(models.id, project.modelId)).get();
    const log = db
      .select()
      .from(buildLogEntries)
      .where(eq(buildLogEntries.projectId, id))
      .all()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const photos = db.select().from(projectPhotos).where(eq(projectPhotos.projectId, id)).all();
    const usedPaints = db
      .select({ projectPaint: projectPaints, paint: paints })
      .from(projectPaints)
      .leftJoin(paints, eq(projectPaints.paintId, paints.id))
      .where(eq(projectPaints.projectId, id))
      .all();
    return { ...project, model, log, photos, usedPaints };
  });

  app.patch("/api/projects/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const body = parseBody(projectUpdateSchema, req.body, reply);
    if (!body) return;

    const existing = db.select().from(projects).where(eq(projects.id, id)).get();
    if (!existing) return reply.code(404).send({ error: "not_found" });

    if (body.coverPhotoId != null) {
      const photo = db.select().from(projectPhotos).where(eq(projectPhotos.id, body.coverPhotoId)).get();
      if (!photo || photo.projectId !== id) {
        return reply.code(400).send({ error: "invalid_cover_photo" });
      }
    }

    const now = new Date().toISOString();
    const patch: typeof body & { startedAt?: string; completedAt?: string } = { ...body };
    // Minimize manual data entry (spec §15): a status transition sets the matching
    // timestamp automatically, the first time only — never overwrites a value already set.
    if (body.status === "In Progress" && !existing.startedAt && !body.startedAt) {
      patch.startedAt = now;
    }
    if (body.status === "Completed" && !existing.completedAt && !body.completedAt) {
      patch.completedAt = now;
    }

    const [row] = await db
      .update(projects)
      .set({ ...patch, updatedAt: now })
      .where(eq(projects.id, id))
      .returning();
    return row;
  });

  // --- build log: fast "+ Add progress" workflow (spec §15) ----------------
  app.get("/api/projects/:id/log", async (req) => {
    const id = Number((req.params as { id: string }).id);
    return db.select().from(buildLogEntries).where(eq(buildLogEntries.projectId, id)).all();
  });

  app.post("/api/projects/:id/log", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const body = parseBody(buildLogCreateSchema, req.body, reply);
    if (!body) return;
    const [row] = await db
      .insert(buildLogEntries)
      .values({ ...body, projectId: id })
      .returning();
    reply.code(201).send(row);
  });

  // --- photos ---------------------------------------------------------------
  app.get("/api/projects/:id/photos", async (req) => {
    const id = Number((req.params as { id: string }).id);
    return db.select().from(projectPhotos).where(eq(projectPhotos.projectId, id)).all();
  });

  app.post("/api/projects/:id/photos", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: "no_file" });

    const dir = join(UPLOAD_DIR, "projects", String(id));
    mkdirSync(dir, { recursive: true });
    const filename = `${Date.now()}-${basename(file.filename)}`;
    const destPath = join(dir, filename);
    await pipeline(file.file, createWriteStream(destPath));

    const [row] = await db
      .insert(projectPhotos)
      .values({
        projectId: id,
        filename: join("projects", String(id), filename),
        originalFilename: file.filename,
      })
      .returning();
    reply.code(201).send(row);
  });

  app.delete("/api/projects/:id/photos/:photoId", async (req, reply) => {
    const photoId = Number((req.params as { photoId: string }).photoId);
    const photo = db.select().from(projectPhotos).where(eq(projectPhotos.id, photoId)).get();
    if (!photo) return reply.code(404).send({ error: "not_found" });

    await db.delete(projectPhotos).where(eq(projectPhotos.id, photoId));
    unlink(join(UPLOAD_DIR, photo.filename), () => {
      // best-effort — the DB row is the source of truth; a missing file is not an error
    });
    reply.code(204).send();
  });

  // --- paints actually used on this build -----------------------------------
  app.post("/api/projects/:id/paints", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const body = parseBody(projectPaintCreateSchema, req.body, reply);
    if (!body) return;

    const existing = db
      .select()
      .from(projectPaints)
      .where(eq(projectPaints.projectId, id))
      .all()
      .find((r) => r.paintId === body.paintId);
    if (existing) return reply.code(409).send({ error: "already_linked" });

    const [row] = await db
      .insert(projectPaints)
      .values({ ...body, projectId: id })
      .returning();
    reply.code(201).send(row);
  });

  app.delete("/api/projects/:id/paints/:paintId", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const paintId = Number((req.params as { paintId: string }).paintId);
    await db
      .delete(projectPaints)
      .where(and(eq(projectPaints.projectId, id), eq(projectPaints.paintId, paintId)));
    reply.code(204).send();
  });
}
