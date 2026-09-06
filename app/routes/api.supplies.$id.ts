import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { supplies } from "../db/schema";
import { supplyUpdateSchema } from "../lib/schemas";
import { parseBody } from "../lib/validate.server";
import { notFound, noContent, idParam } from "../lib/api.server";

export async function loader({ params }: { params: { id: string } }) {
  const id = idParam(params);
  const row = db.select().from(supplies).where(eq(supplies.id, id)).get();
  if (!row) {
    return notFound();
  }
  return Response.json(row);
}

export async function action({ request, params }: { request: Request; params: { id: string } }) {
  const id = idParam(params);

  if (request.method === "PATCH") {
    const body = parseBody(supplyUpdateSchema, await request.json());
    const [row] = await db
      .update(supplies)
      .set({ ...body, updatedAt: new Date().toISOString() })
      .where(eq(supplies.id, id))
      .returning();
    if (!row) {
      return notFound();
    }
    return Response.json(row);
  }

  if (request.method === "DELETE") {
    await db.delete(supplies).where(eq(supplies.id, id));
    return noContent();
  }

  return new Response("Method Not Allowed", { status: 405 });
}
