import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { manufacturers } from "../db/schema";
import { notFound, idParam } from "../lib/api.server";

export async function loader({ params }: { params: { id: string } }) {
  const id = idParam(params);
  const row = db.select().from(manufacturers).where(eq(manufacturers.id, id)).get();
  if (!row) {
    return notFound();
  }
  return Response.json(row);
}
