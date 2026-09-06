import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import {
  paints,
  manufacturers,
  paintInventory,
  modelPaints,
  projectPaints,
  shoppingListItems,
} from "../db/schema";
import { paintUpdateSchema } from "../lib/schemas";
import { parseBody } from "../lib/validate.server";
import { notFound, noContent, conflict, idParam } from "../lib/api.server";

export async function loader({ params }: { params: { id: string } }) {
  const id = idParam(params);
  const paint = db.select().from(paints).where(eq(paints.id, id)).get();
  if (!paint) {
    return notFound();
  }
  const manufacturer = db
    .select()
    .from(manufacturers)
    .where(eq(manufacturers.id, paint.manufacturerId))
    .get();
  const inventory = db.select().from(paintInventory).where(eq(paintInventory.paintId, id)).all();
  return Response.json({ ...paint, manufacturer, inventory });
}

export async function action({ request, params }: { request: Request; params: { id: string } }) {
  const id = idParam(params);

  if (request.method === "PATCH") {
    const body = parseBody(paintUpdateSchema, await request.json());
    const [row] = await db
      .update(paints)
      .set({ ...body, updatedAt: new Date().toISOString() })
      .where(eq(paints.id, id))
      .returning();
    if (!row) {
      return notFound();
    }
    return Response.json(row);
  }

  if (request.method === "DELETE") {
    const blockers: string[] = [];
    const inventoryCount = db
      .select()
      .from(paintInventory)
      .where(eq(paintInventory.paintId, id))
      .all().length;
    if (inventoryCount > 0) {
      blockers.push(`${inventoryCount} inventory ${inventoryCount === 1 ? "entry" : "entries"}`);
    }
    const modelReqCount = db
      .select()
      .from(modelPaints)
      .where(eq(modelPaints.paintId, id))
      .all().length;
    if (modelReqCount > 0) {
      blockers.push(`${modelReqCount} model requirement${modelReqCount === 1 ? "" : "s"}`);
    }
    const buildUseCount = db
      .select()
      .from(projectPaints)
      .where(eq(projectPaints.paintId, id))
      .all().length;
    if (buildUseCount > 0) {
      blockers.push(`${buildUseCount} build${buildUseCount === 1 ? "" : "s"}`);
    }
    const shoppingCount = db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.paintId, id))
      .all().length;
    if (shoppingCount > 0) {
      blockers.push(`${shoppingCount} shopping list item${shoppingCount === 1 ? "" : "s"}`);
    }

    if (blockers.length > 0) {
      return conflict(
        "in_use",
        `Can't delete — still referenced by ${blockers.join(", ")}. Remove those first.`,
      );
    }

    await db.delete(paints).where(eq(paints.id, id));
    return noContent();
  }

  return new Response("Method Not Allowed", { status: 405 });
}
