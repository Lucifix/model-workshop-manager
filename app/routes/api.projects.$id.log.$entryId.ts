import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { buildLogEntries } from "../db/schema";
import { buildLogUpdateSchema } from "../lib/schemas";
import { parseBody } from "../lib/validate.server";
import { notFound, noContent, methodNotAllowed, idParam } from "../lib/api.server";

export async function action({
  request,
  params,
}: {
  request: Request;
  params: { entryId: string };
}) {
  const entryId = idParam(params, "entryId");

  if (request.method === "PATCH") {
    const body = parseBody(buildLogUpdateSchema, await request.json());
    const [row] = await db
      .update(buildLogEntries)
      .set(body)
      .where(eq(buildLogEntries.id, entryId))
      .returning();
    if (!row) {
      return notFound();
    }
    return Response.json(row);
  }

  if (request.method === "DELETE") {
    const [row] = await db
      .delete(buildLogEntries)
      .where(eq(buildLogEntries.id, entryId))
      .returning();
    if (!row) {
      return notFound();
    }
    return noContent();
  }

  return methodNotAllowed();
}
