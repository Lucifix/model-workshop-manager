import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { shoppingListItems, paints } from "../db/schema.js";
import { shoppingListCreateSchema } from "../lib/schemas.js";
import { parseBody } from "../lib/validate.js";

export async function shoppingListRoutes(app: FastifyInstance) {
  app.get("/api/shopping-list", async (req) => {
    const { purchased } = req.query as Record<string, string | undefined>;
    let rows = db
      .select({ item: shoppingListItems, paint: paints })
      .from(shoppingListItems)
      .leftJoin(paints, eq(shoppingListItems.paintId, paints.id))
      .all();
    if (purchased !== undefined) {
      const want = purchased === "true";
      rows = rows.filter((r) => r.item.purchased === want);
    }
    return rows;
  });

  app.post("/api/shopping-list", async (req, reply) => {
    const body = parseBody(shoppingListCreateSchema, req.body, reply);
    if (!body) {
      return;
    }
    const [row] = await db.insert(shoppingListItems).values(body).returning();
    reply.code(201).send(row);
  });

  app.patch("/api/shopping-list/:id/purchased", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const [row] = await db
      .update(shoppingListItems)
      .set({ purchased: true, purchasedAt: new Date().toISOString() })
      .where(eq(shoppingListItems.id, id))
      .returning();
    if (!row) {
      return reply.code(404).send({ error: "not_found" });
    }
    return row;
  });
}
