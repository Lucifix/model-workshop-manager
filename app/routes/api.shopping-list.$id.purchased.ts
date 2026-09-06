import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { shoppingListItems } from "../db/schema";
import { notFound, idParam } from "../lib/api.server";

export async function action({ params }: { params: { id: string } }) {
  const id = idParam(params);
  const [row] = await db
    .update(shoppingListItems)
    .set({ purchased: true, purchasedAt: new Date().toISOString() })
    .where(eq(shoppingListItems.id, id))
    .returning();
  if (!row) {
    return notFound();
  }
  return Response.json(row);
}
