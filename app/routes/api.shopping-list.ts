import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { shoppingListItems, paints } from "../db/schema";
import { shoppingListCreateSchema } from "../lib/schemas";
import { parseBody } from "../lib/validate.server";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const purchased = url.searchParams.get("purchased");
  let rows = db
    .select({ item: shoppingListItems, paint: paints })
    .from(shoppingListItems)
    .leftJoin(paints, eq(shoppingListItems.paintId, paints.id))
    .all();
  if (purchased !== null) {
    const want = purchased === "true";
    rows = rows.filter((r) => r.item.purchased === want);
  }
  return Response.json(rows);
}

export async function action({ request }: { request: Request }) {
  const body = parseBody(shoppingListCreateSchema, await request.json());
  const [row] = await db.insert(shoppingListItems).values(body).returning();
  return Response.json(row, { status: 201 });
}
