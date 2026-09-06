import { db } from "../db/client.server";
import { paints } from "../db/schema";

export async function loader() {
  return Response.json(db.select().from(paints).all());
}
