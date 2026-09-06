import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { buildLogEntries } from "../db/schema";
import { buildLogCreateSchema } from "../lib/schemas";
import { parseBody } from "../lib/validate.server";
import { idParam } from "../lib/api.server";

export async function loader({ params }: { params: { id: string } }) {
  const id = idParam(params);
  return Response.json(
    db.select().from(buildLogEntries).where(eq(buildLogEntries.projectId, id)).all(),
  );
}

export async function action({ request, params }: { request: Request; params: { id: string } }) {
  const id = idParam(params);
  const body = parseBody(buildLogCreateSchema, await request.json());
  const [row] = await db
    .insert(buildLogEntries)
    .values({ ...body, projectId: id })
    .returning();
  return Response.json(row, { status: 201 });
}
