import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { paintInventory } from "../db/schema";
import { paintInventoryUpdateSchema } from "../lib/schemas";
import { parseBody } from "../lib/validate.server";
import { notFound, noContent, idParam } from "../lib/api.server";

export async function action({ request, params }: { request: Request; params: { id: string } }) {
  const id = idParam(params);

  if (request.method === "PATCH") {
    const body = parseBody(paintInventoryUpdateSchema, await request.json());
    const [row] = await db
      .update(paintInventory)
      .set({ ...body, updatedAt: new Date().toISOString() })
      .where(eq(paintInventory.id, id))
      .returning();
    if (!row) {
      return notFound();
    }
    return Response.json(row);
  }

  if (request.method === "DELETE") {
    await db.delete(paintInventory).where(eq(paintInventory.id, id));
    return noContent();
  }

  return new Response("Method Not Allowed", { status: 405 });
}
