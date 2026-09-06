import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { models, modelPaints } from "../db/schema";
import { modelPaintCreateSchema } from "../lib/schemas";
import { parseBody } from "../lib/validate.server";
import { notFound, conflict, idParam } from "../lib/api.server";

export async function action({ request, params }: { request: Request; params: { id: string } }) {
  const id = idParam(params);
  const model = db.select().from(models).where(eq(models.id, id)).get();
  if (!model) {
    return notFound();
  }

  const body = parseBody(modelPaintCreateSchema, await request.json());

  const existing = db
    .select()
    .from(modelPaints)
    .where(eq(modelPaints.modelId, id))
    .all()
    .find((r) => r.paintId === body.paintId);
  if (existing) {
    return conflict("already_linked");
  }

  const [row] = await db
    .insert(modelPaints)
    .values({ ...body, modelId: id, source: "manual" })
    .returning();
  return Response.json(row, { status: 201 });
}
