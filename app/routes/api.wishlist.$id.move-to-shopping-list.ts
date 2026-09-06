import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { wishlistItems, shoppingListItems } from "../db/schema";
import { notFound, idParam } from "../lib/api.server";

export async function action({ params }: { params: { id: string } }) {
  const id = idParam(params);
  const item = db.select().from(wishlistItems).where(eq(wishlistItems.id, id)).get();
  if (!item) {
    return notFound();
  }

  const [row] = await db
    .insert(shoppingListItems)
    .values({ paintId: item.paintId, description: item.description, priority: item.priority })
    .returning();
  await db.delete(wishlistItems).where(eq(wishlistItems.id, id));
  return Response.json(row, { status: 201 });
}
