import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { projectPaints } from "../db/schema";
import { projectPaintCreateSchema } from "../lib/schemas";
import { parseBody } from "../lib/validate.server";
import { conflict, idParam } from "../lib/api.server";

export async function action({ request, params }: { request: Request; params: { id: string } }) {
  const id = idParam(params);
  const body = parseBody(projectPaintCreateSchema, await request.json());

  const existing = db
    .select()
    .from(projectPaints)
    .where(eq(projectPaints.projectId, id))
    .all()
    .find((r) => r.paintId === body.paintId);
  if (existing) {
    return conflict("already_linked");
  }

  const [row] = await db
    .insert(projectPaints)
    .values({ ...body, projectId: id })
    .returning();
  return Response.json(row, { status: 201 });
}
