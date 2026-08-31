import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { wishlistItems, shoppingListItems, paints } from "../db/schema.js";
import { wishlistCreateSchema, wishlistUpdateSchema } from "../lib/schemas.js";
import { parseBody } from "../lib/validate.js";

export async function wishlistRoutes(app: FastifyInstance) {
  app.get("/api/wishlist", async () => {
    return db
      .select({ item: wishlistItems, paint: paints })
      .from(wishlistItems)
      .leftJoin(paints, eq(wishlistItems.paintId, paints.id))
      .all();
  });

  app.post("/api/wishlist", async (req, reply) => {
    const body = parseBody(wishlistCreateSchema, req.body, reply);
    if (!body) return;
    const [row] = await db.insert(wishlistItems).values(body).returning();
    reply.code(201).send(row);
  });

  app.patch("/api/wishlist/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const body = parseBody(wishlistUpdateSchema, req.body, reply);
    if (!body) return;
    const [row] = await db.update(wishlistItems).set(body).where(eq(wishlistItems.id, id)).returning();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });

  app.delete("/api/wishlist/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    await db.delete(wishlistItems).where(eq(wishlistItems.id, id));
    reply.code(204).send();
  });

  app.post("/api/wishlist/:id/move-to-shopping-list", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const item = db.select().from(wishlistItems).where(eq(wishlistItems.id, id)).get();
    if (!item) return reply.code(404).send({ error: "not_found" });

    const [row] = await db
      .insert(shoppingListItems)
      .values({
        paintId: item.paintId,
        description: item.description,
        priority: item.priority,
      })
      .returning();
    await db.delete(wishlistItems).where(eq(wishlistItems.id, id));
    reply.code(201).send(row);
  });
}
