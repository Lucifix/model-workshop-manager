import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { paints, paintInventory, manufacturers } from "../db/schema.js";
import { paintCreateSchema, paintUpdateSchema } from "../lib/schemas.js";
import { parseBody } from "../lib/validate.js";

export async function paintRoutes(app: FastifyInstance) {
  app.get("/api/paints", async (req) => {
    const { q, manufacturerId, type } = req.query as Record<string, string | undefined>;
    let rows = db
      .select({ paint: paints, manufacturer: manufacturers })
      .from(paints)
      .leftJoin(manufacturers, eq(paints.manufacturerId, manufacturers.id))
      .all();

    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.paint.name.toLowerCase().includes(needle) ||
          r.paint.productCode.toLowerCase().includes(needle),
      );
    }
    if (manufacturerId) rows = rows.filter((r) => r.paint.manufacturerId === Number(manufacturerId));
    if (type) rows = rows.filter((r) => r.paint.type === type);
    return rows;
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
    await db.delete(paints).where(eq(paints.id, id));
    reply.code(204).send();
  });
}
