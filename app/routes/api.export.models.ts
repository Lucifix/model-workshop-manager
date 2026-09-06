import { db } from "../db/client.server";
import { models } from "../db/schema";

export async function loader() {
  return Response.json(db.select().from(models).all());
}
