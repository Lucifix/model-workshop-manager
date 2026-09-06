import { and, eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { modelPaints } from "../db/schema";
import { noContent, idParam } from "../lib/api.server";

export async function action({ params }: { params: { id: string; paintId: string } }) {
  const id = idParam(params);
  const paintId = idParam(params, "paintId");
  await db
    .delete(modelPaints)
    .where(and(eq(modelPaints.modelId, id), eq(modelPaints.paintId, paintId)));
  return noContent();
}
