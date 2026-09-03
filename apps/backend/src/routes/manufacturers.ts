import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { manufacturers, paints } from "../db/schema.js";
import { manufacturerCreateSchema } from "../lib/schemas.js";
import { parseBody } from "../lib/validate.js";

export async function manufacturerRoutes(app: FastifyInstance) {
  app.get("/api/manufacturers", async () => {
    const rows = db.select().from(manufacturers).all();
    const paintManufacturerIds = db
      .select({ manufacturerId: paints.manufacturerId })
      .from(paints)
      .all();

    const countByManufacturer = new Map<number, number>();
    for (const { manufacturerId } of paintManufacturerIds) {
      countByManufacturer.set(manufacturerId, (countByManufacturer.get(manufacturerId) ?? 0) + 1);
    }

    return rows.map((m) => ({ ...m, paintCount: countByManufacturer.get(m.id) ?? 0 }));
  });

  app.post("/api/manufacturers", async (req, reply) => {
    const body = parseBody(manufacturerCreateSchema, req.body, reply);
    if (!body) {
      return;
    }
    const [row] = await db.insert(manufacturers).values(body).returning();
    reply.code(201).send(row);
  });

  app.get("/api/manufacturers/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const row = db.select().from(manufacturers).where(eq(manufacturers.id, id)).get();
    if (!row) {
      return reply.code(404).send({ error: "not_found" });
    }
    return row;
  });
}
