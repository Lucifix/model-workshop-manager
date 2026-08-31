import type { FastifyInstance } from "fastify";
import { eq, and, or, like, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { paints, paintInventory, manufacturers, modelPaints, projectPaints, shoppingListItems } from "../db/schema.js";
import { paintCreateSchema, paintUpdateSchema } from "../lib/schemas.js";
import { parseBody } from "../lib/validate.js";

const DEFAULT_PAGE_SIZE = 60;
const MAX_PAGE_SIZE = 200;

export async function paintRoutes(app: FastifyInstance) {
  app.get("/api/paints", async (req) => {
    const { q, manufacturerId, type, status, limit: limitRaw, offset: offsetRaw } = req.query as Record<
      string,
      string | undefined
    >;

    const conditions = [];
    if (q?.trim()) {
      const needle = `%${q.trim()}%`;
      conditions.push(or(like(paints.name, needle), like(paints.productCode, needle)));
    }
    if (manufacturerId) conditions.push(eq(paints.manufacturerId, Number(manufacturerId)));
    if (type) conditions.push(eq(paints.type, type));

    if (status === "owned" || status === "not_owned") {
      const ownedIds = db
        .selectDistinct({ paintId: paintInventory.paintId })
        .from(paintInventory)
        .all()
        .map((r) => r.paintId);
      if (status === "owned") {
        conditions.push(ownedIds.length > 0 ? inArray(paints.id, ownedIds) : sql`0`);
      } else if (ownedIds.length > 0) {
        conditions.push(notInArray(paints.id, ownedIds));
      }
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const limit = Math.min(Math.max(Number(limitRaw) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
    const offset = Math.max(Number(offsetRaw) || 0, 0);

    const page = db
      .select({ paint: paints, manufacturer: manufacturers })
      .from(paints)
      .leftJoin(manufacturers, eq(paints.manufacturerId, manufacturers.id))
      .where(where)
      .orderBy(paints.name)
      .limit(limit + 1)
      .offset(offset)
      .all();

    const hasMore = page.length > limit;
    const rows = hasMore ? page.slice(0, limit) : page;

    const paintIds = rows.map((r) => r.paint.id);
    const inventoryByPaintId = new Map<number, (typeof paintInventory.$inferSelect)[]>();
    if (paintIds.length > 0) {
      for (const row of db.select().from(paintInventory).where(inArray(paintInventory.paintId, paintIds)).all()) {
        const list = inventoryByPaintId.get(row.paintId) ?? [];
        list.push(row);
        inventoryByPaintId.set(row.paintId, list);
      }
    }

    return {
      rows: rows.map((r) => ({ ...r, inventory: inventoryByPaintId.get(r.paint.id) ?? [] })),
      hasMore,
    };
  });

  app.post("/api/paints", async (req, reply) => {
    const body = parseBody(paintCreateSchema, req.body, reply);
    if (!body) return;
    const [row] = await db
      .insert(paints)
      .values({ ...body, source: body.source ?? "manual" })
      .returning();
    reply.code(201).send(row);
  });

  app.get("/api/paints/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const paint = db.select().from(paints).where(eq(paints.id, id)).get();
    if (!paint) return reply.code(404).send({ error: "not_found" });
    const manufacturer = db.select().from(manufacturers).where(eq(manufacturers.id, paint.manufacturerId)).get();
    const inventory = db
      .select()
      .from(paintInventory)
      .where(eq(paintInventory.paintId, id))
      .all();
    return { ...paint, manufacturer, inventory };
  });

  app.patch("/api/paints/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const body = parseBody(paintUpdateSchema, req.body, reply);
    if (!body) return;
    const [row] = await db
      .update(paints)
      .set({ ...body, updatedAt: new Date().toISOString() })
      .where(eq(paints.id, id))
      .returning();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });

  app.delete("/api/paints/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);

    const blockers: string[] = [];
    const inventoryCount = db.select().from(paintInventory).where(eq(paintInventory.paintId, id)).all().length;
    if (inventoryCount > 0) blockers.push(`${inventoryCount} inventory ${inventoryCount === 1 ? "entry" : "entries"}`);
    const modelReqCount = db.select().from(modelPaints).where(eq(modelPaints.paintId, id)).all().length;
    if (modelReqCount > 0) blockers.push(`${modelReqCount} model requirement${modelReqCount === 1 ? "" : "s"}`);
    const buildUseCount = db.select().from(projectPaints).where(eq(projectPaints.paintId, id)).all().length;
    if (buildUseCount > 0) blockers.push(`${buildUseCount} build${buildUseCount === 1 ? "" : "s"}`);
    const shoppingCount = db.select().from(shoppingListItems).where(eq(shoppingListItems.paintId, id)).all().length;
    if (shoppingCount > 0) blockers.push(`${shoppingCount} shopping list item${shoppingCount === 1 ? "" : "s"}`);

    if (blockers.length > 0) {
      return reply.code(409).send({
        error: "in_use",
        message: `Can't delete — still referenced by ${blockers.join(", ")}. Remove those first.`,
      });
    }

    await db.delete(paints).where(eq(paints.id, id));
    reply.code(204).send();
  });
}
