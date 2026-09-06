import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { ownedModels, models } from "../db/schema";
import { ownedModelCreateSchema } from "../lib/schemas";
import { parseBody } from "../lib/validate.server";

export async function loader() {
  return Response.json(
    db
      .select({ owned: ownedModels, model: models })
      .from(ownedModels)
      .leftJoin(models, eq(ownedModels.modelId, models.id))
      .all(),
  );
}

export async function action({ request }: { request: Request }) {
  const body = parseBody(ownedModelCreateSchema, await request.json());
  const [row] = await db.insert(ownedModels).values(body).returning();
  return Response.json(row, { status: 201 });
}
