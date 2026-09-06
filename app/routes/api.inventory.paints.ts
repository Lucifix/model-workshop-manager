import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { paintInventory, paints } from "../db/schema";
import { paintInventoryCreateSchema } from "../lib/schemas";
import { parseBody } from "../lib/validate.server";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const fillLevel = url.searchParams.get("fillLevel") ?? undefined;

  let rows = db
    .select({ inventory: paintInventory, paint: paints })
    .from(paintInventory)
    .leftJoin(paints, eq(paintInventory.paintId, paints.id))
    .all();
  if (status) {
    rows = rows.filter((r) => r.inventory.status === status);
  }
  if (fillLevel) {
    rows = rows.filter((r) => r.inventory.fillLevel === fillLevel);
  }
  return Response.json(rows);
}

export async function action({ request }: { request: Request }) {
  const body = parseBody(paintInventoryCreateSchema, await request.json());
  const [row] = await db.insert(paintInventory).values(body).returning();
  return Response.json(row, { status: 201 });
}
