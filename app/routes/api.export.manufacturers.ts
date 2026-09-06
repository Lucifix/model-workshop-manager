import { db } from "../db/client.server";
import { manufacturers } from "../db/schema";

export async function loader() {
  return Response.json(db.select().from(manufacturers).all());
}
