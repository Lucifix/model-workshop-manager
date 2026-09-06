import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { models } from "../db/schema";
import { notFound, badRequest, idParam } from "../lib/api.server";
import { saveUploadedFile } from "../lib/upload.server";

// Attach an instruction manual (PDF) — same "your own file, locally stored"
// pattern as the box-photo upload. An instructionUrl link is also settable
// directly via PATCH.
export async function action({ request, params }: { request: Request; params: { id: string } }) {
  const id = idParam(params);
  const existing = db.select().from(models).where(eq(models.id, id)).get();
  if (!existing) {
    return notFound();
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return badRequest("no_file");
  }

  const { url: instructionUrl } = await saveUploadedFile(file, "models", String(id));
  const [row] = await db
    .update(models)
    .set({ instructionUrl, updatedAt: new Date().toISOString() })
    .where(eq(models.id, id))
    .returning();
  return Response.json(row, { status: 201 });
}
