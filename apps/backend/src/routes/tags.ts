import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { tags } from "../db/schema.js";
import { tagCreateSchema } from "../lib/schemas.js";
import { parseBody } from "../lib/validate.js";

export async function tagRoutes(app: FastifyInstance) {
  app.get("/api/tags", async () => {
    return db.select().from(tags).orderBy(tags.name).all();
  });

  app.post("/api/tags", async (req, reply) => {
    const body = parseBody(tagCreateSchema, req.body, reply);
    if (!body) {
      return;
    }
    const name = body.name.trim();
    const existing = db.select().from(tags).where(eq(tags.name, name)).get();
    if (existing) {
      return existing;
    }
    const [row] = await db.insert(tags).values({ name }).returning();
    reply.code(201).send(row);
  });
}
