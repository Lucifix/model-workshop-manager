import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { models } from "../db/schema";
import { notFound, badRequest, idParam } from "../lib/api.server";
import { saveUploadedFile } from "../lib/upload.server";

// Upload a personal photo of the box/kit.
// Local file storage only; never a fetch of a manufacturer's own product image.
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

  const { url: imageUrl } = await saveUploadedFile(file, "models", String(id));
  const [row] = await db
    .update(models)
    .set({ imageUrl, updatedAt: new Date().toISOString() })
    .where(eq(models.id, id))
    .returning();
  return Response.json(row, { status: 201 });
}
