import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
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
import { modelCreateSchema, modelUpdateSchema } from "../lib/schemas.js";
import { parseBody } from "../lib/validate.js";
import { paintAvailability } from "../lib/paintAvailability.js";

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
    return rows;
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

    return {
      ...model,
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
      projects: projectHistory,
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
}
