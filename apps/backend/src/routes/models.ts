import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { mkdirSync, createWriteStream } from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { db } from "../db/client.js";
import {
  models,
  manufacturers,
  modelPaints,
  paints,
  paintInventory,
  ownedModels,
  projects,
} from "../db/schema.js";
import { modelCreateSchema, modelUpdateSchema, modelPaintCreateSchema } from "../lib/schemas.js";
import { parseBody } from "../lib/validate.js";
import { paintAvailability } from "../lib/paintAvailability.js";
import { resolveCoverPhotoUrls } from "../lib/coverPhotos.js";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./data/uploads";

export async function modelRoutes(app: FastifyInstance) {
  app.get("/api/models", async (req) => {
    const { q, manufacturerId, scale, category } = req.query as Record<
      string,
      string | undefined
    >;
    let rows = db
      .select({ model: models, manufacturer: manufacturers })
      .from(models)
      .leftJoin(manufacturers, eq(models.manufacturerId, manufacturers.id))
      .all();

    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.model.name.toLowerCase().includes(needle) ||
          r.model.kitNumber.toLowerCase().includes(needle),
      );
    }
    if (manufacturerId) rows = rows.filter((r) => r.model.manufacturerId === Number(manufacturerId));
    if (scale) rows = rows.filter((r) => r.model.scale === scale);
    if (category) rows = rows.filter((r) => r.model.category === category);

    const ownershipByModelId = new Map<number, (typeof ownedModels.$inferSelect)[]>();
    for (const row of db.select().from(ownedModels).all()) {
      const list = ownershipByModelId.get(row.modelId) ?? [];
      list.push(row);
      ownershipByModelId.set(row.modelId, list);
    }

    return rows.map((r) => ({ ...r, ownership: ownershipByModelId.get(r.model.id) ?? [] }));
  });

  app.post("/api/models", async (req, reply) => {
    const body = parseBody(modelCreateSchema, req.body, reply);
    if (!body) return;
    const [row] = await db
      .insert(models)
      .values({ ...body, source: body.source ?? "manual" })
      .returning();
    reply.code(201).send(row);
  });

  app.get("/api/models/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const model = db.select().from(models).where(eq(models.id, id)).get();
    if (!model) return reply.code(404).send({ error: "not_found" });
    const manufacturer = db.select().from(manufacturers).where(eq(manufacturers.id, model.manufacturerId)).get();

    const requiredPaints = db
      .select({ modelPaint: modelPaints, paint: paints })
      .from(modelPaints)
      .leftJoin(paints, eq(modelPaints.paintId, paints.id))
      .where(eq(modelPaints.modelId, id))
      .all();

    const ownedPaintIds = new Set(
      db.select({ paintId: paintInventory.paintId }).from(paintInventory).all()
        .filter((r) => r.paintId != null)
        .map((r) => r.paintId as number),
    );

    const ownership = db.select().from(ownedModels).where(eq(ownedModels.modelId, id)).all();
    const projectHistory = db.select().from(projects).where(eq(projects.modelId, id)).all();
    const coverPhotoUrls = resolveCoverPhotoUrls(projectHistory);

    return {
      ...model,
      manufacturer,
      requiredPaints: requiredPaints.map((r) => ({
        ...r.paint,
        usage: r.modelPaint.usage,
        confidence: r.modelPaint.confidence,
        owned: r.paint ? ownedPaintIds.has(r.paint.id) : false,
      })),
      availability: paintAvailability(
        requiredPaints.map((r) => (r.paint ? ownedPaintIds.has(r.paint.id) : false)),
      ),
      ownership,
      projects: projectHistory.map((p) => ({ ...p, coverPhotoUrl: coverPhotoUrls.get(p.id) })),
    };
  });

  app.patch("/api/models/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const body = parseBody(modelUpdateSchema, req.body, reply);
    if (!body) return;
    const [row] = await db
      .update(models)
      .set({ ...body, updatedAt: new Date().toISOString() })
      .where(eq(models.id, id))
      .returning();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });

  app.delete("/api/models/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    await db.delete(models).where(eq(models.id, id));
    reply.code(204).send();
  });

  // Upload a personal photo of the box/kit — see docs/PLAN.md §35.5 (method 2).
  // Local file storage only; never a fetch of a manufacturer's own product image.
  app.post("/api/models/:id/image", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const existing = db.select().from(models).where(eq(models.id, id)).get();
    if (!existing) return reply.code(404).send({ error: "not_found" });

    const file = await req.file();
    if (!file) return reply.code(400).send({ error: "no_file" });

    const dir = join(UPLOAD_DIR, "models", String(id));
    mkdirSync(dir, { recursive: true });
    const filename = `${Date.now()}-${file.filename}`;
    await pipeline(file.file, createWriteStream(join(dir, filename)));

    const imageUrl = `/uploads/models/${id}/${filename}`;
    const [row] = await db
      .update(models)
      .set({ imageUrl, updatedAt: new Date().toISOString() })
      .where(eq(models.id, id))
      .returning();
    reply.code(201).send(row);
  });

  // Attach an instruction manual (PDF) — same "your own file, locally stored" pattern as
  // the box-photo upload above. An instructionUrl link is also settable directly via PATCH.
  app.post("/api/models/:id/instructions", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const existing = db.select().from(models).where(eq(models.id, id)).get();
    if (!existing) return reply.code(404).send({ error: "not_found" });

    const file = await req.file();
    if (!file) return reply.code(400).send({ error: "no_file" });

    const dir = join(UPLOAD_DIR, "models", String(id));
    mkdirSync(dir, { recursive: true });
    const filename = `${Date.now()}-${file.filename}`;
    await pipeline(file.file, createWriteStream(join(dir, filename)));

    const instructionUrl = `/uploads/models/${id}/${filename}`;
    const [row] = await db
      .update(models)
      .set({ instructionUrl, updatedAt: new Date().toISOString() })
      .where(eq(models.id, id))
      .returning();
    reply.code(201).send(row);
  });

  // --- required paints (model_paints) ---------------------------------------
  app.post("/api/models/:id/paints", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const model = db.select().from(models).where(eq(models.id, id)).get();
    if (!model) return reply.code(404).send({ error: "not_found" });

    const body = parseBody(modelPaintCreateSchema, req.body, reply);
    if (!body) return;

    const existing = db
      .select()
      .from(modelPaints)
      .where(eq(modelPaints.modelId, id))
      .all()
      .find((r) => r.paintId === body.paintId);
    if (existing) return reply.code(409).send({ error: "already_linked" });

    const [row] = await db
      .insert(modelPaints)
      .values({ ...body, modelId: id, source: "manual" })
      .returning();
    reply.code(201).send(row);
  });

  app.delete("/api/models/:id/paints/:paintId", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const paintId = Number((req.params as { paintId: string }).paintId);
    await db
      .delete(modelPaints)
      .where(and(eq(modelPaints.modelId, id), eq(modelPaints.paintId, paintId)));
    reply.code(204).send();
  });
}
