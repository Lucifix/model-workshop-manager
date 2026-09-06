import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { tags } from "../db/schema";
import { tagCreateSchema } from "../lib/schemas";
import { parseBody } from "../lib/validate.server";

export async function loader() {
  return Response.json(db.select().from(tags).orderBy(tags.name).all());
}

export async function action({ request }: { request: Request }) {
  const body = parseBody(tagCreateSchema, await request.json());
  const name = body.name.trim();
  const existing = db.select().from(tags).where(eq(tags.name, name)).get();
  if (existing) {
    return Response.json(existing);
  }
  const [row] = await db.insert(tags).values({ name }).returning();
  return Response.json(row, { status: 201 });
}
