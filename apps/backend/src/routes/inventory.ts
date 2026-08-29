import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { ownedModels, paintInventory, models, paints } from "../db/schema.js";
import {
  ownedModelCreateSchema,
  paintInventoryCreateSchema,
  paintInventoryUpdateSchema,
} from "../lib/schemas.js";
import { parseBody } from "../lib/validate.js";

export async function inventoryRoutes(app: FastifyInstance) {
  // --- owned models -------------------------------------------------------
  app.get("/api/inventory/models", async () => {
    return db
      .select({ owned: ownedModels, model: models })
      .from(ownedModels)
      .leftJoin(models, eq(ownedModels.modelId, models.id))
      .all();
  });

  app.post("/api/inventory/models", async (req, reply) => {
    const body = parseBody(ownedModelCreateSchema, req.body, reply);
    if (!body) return;
    const [row] = await db.insert(ownedModels).values(body).returning();
    reply.code(201).send(row);
  });

  // --- paint inventory ------------------------------------------------------
  app.get("/api/inventory/paints", async (req) => {
    const { status, fillLevel } = req.query as Record<string, string | undefined>;
    let rows = db
      .select({ inventory: paintInventory, paint: paints })
      .from(paintInventory)
      .leftJoin(paints, eq(paintInventory.paintId, paints.id))
      .all();
    if (status) rows = rows.filter((r) => r.inventory.status === status);
    if (fillLevel) rows = rows.filter((r) => r.inventory.fillLevel === fillLevel);
    return rows;
  });

  app.post("/api/inventory/paints", async (req, reply) => {
    const body = parseBody(paintInventoryCreateSchema, req.body, reply);
    if (!body) return;
    const [row] = await db.insert(paintInventory).values(body).returning();
    reply.code(201).send(row);
  });

  app.patch("/api/inventory/paints/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const body = parseBody(paintInventoryUpdateSchema, req.body, reply);
    if (!body) return;
    const [row] = await db
      .update(paintInventory)
      .set({ ...body, updatedAt: new Date().toISOString() })
      .where(eq(paintInventory.id, id))
      .returning();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });
}
