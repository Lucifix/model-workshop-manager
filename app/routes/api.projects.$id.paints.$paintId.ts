import { and, eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { projectPaints } from "../db/schema";
import { noContent, idParam } from "../lib/api.server";

export async function action({ params }: { params: { id: string; paintId: string } }) {
  const id = idParam(params);
  const paintId = idParam(params, "paintId");
  await db
    .delete(projectPaints)
    .where(and(eq(projectPaints.projectId, id), eq(projectPaints.paintId, paintId)));
  return noContent();
}
