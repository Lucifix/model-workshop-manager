import type { FastifyInstance } from "fastify";
import { eq, and, like } from "drizzle-orm";
import { db } from "../db/client.js";
import { supplies } from "../db/schema.js";
import { supplyCreateSchema, supplyUpdateSchema } from "../lib/schemas.js";
import { parseBody } from "../lib/validate.js";

const LOW_STOCK_THRESHOLD = 1;

export async function supplyRoutes(app: FastifyInstance) {
  app.get("/api/supplies", async (req) => {
    const { q, category, lowStock } = req.query as Record<string, string | undefined>;

    const conditions = [];
    if (q?.trim()) conditions.push(like(supplies.name, `%${q.trim()}%`));
    if (category) conditions.push(eq(supplies.category, category));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    let rows = db.select().from(supplies).where(where).orderBy(supplies.name).all();
    if (lowStock === "true") {
      rows = rows.filter((r) => r.quantity <= LOW_STOCK_THRESHOLD);
    }
    return rows;
  });

  app.post("/api/supplies", async (req, reply) => {
    const body = parseBody(supplyCreateSchema, req.body, reply);
    if (!body) return;
    const [row] = await db.insert(supplies).values(body).returning();
    reply.code(201).send(row);
  });

  app.get("/api/supplies/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const row = db.select().from(supplies).where(eq(supplies.id, id)).get();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });

  app.patch("/api/supplies/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const body = parseBody(supplyUpdateSchema, req.body, reply);
    if (!body) return;
    const [row] = await db
      .update(supplies)
      .set({ ...body, updatedAt: new Date().toISOString() })
      .where(eq(supplies.id, id))
      .returning();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });

  app.delete("/api/supplies/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    await db.delete(supplies).where(eq(supplies.id, id));
    reply.code(204).send();
  });
}
