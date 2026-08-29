import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { manufacturers } from "../db/schema.js";
import { manufacturerCreateSchema } from "../lib/schemas.js";
import { parseBody } from "../lib/validate.js";

export async function manufacturerRoutes(app: FastifyInstance) {
  app.get("/api/manufacturers", async () => {
    return db.select().from(manufacturers).all();
  });

  app.post("/api/manufacturers", async (req, reply) => {
    const body = parseBody(manufacturerCreateSchema, req.body, reply);
    if (!body) return;
    const [row] = await db.insert(manufacturers).values(body).returning();
    reply.code(201).send(row);
  });

  app.get("/api/manufacturers/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const row = db.select().from(manufacturers).where(eq(manufacturers.id, id)).get();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });
}
