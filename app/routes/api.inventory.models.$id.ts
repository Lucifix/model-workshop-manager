import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { ownedModels } from "../db/schema";
import { noContent, idParam } from "../lib/api.server";

export async function action({ params }: { params: { id: string } }) {
  const id = idParam(params);
  await db.delete(ownedModels).where(eq(ownedModels.id, id));
  return noContent();
}
