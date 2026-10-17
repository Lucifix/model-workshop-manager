import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { models } from "../db/schema";
import { notFound, badRequest, idParam } from "../lib/api.server";
import { providers } from "../lib/catalogProviders.server";
import { modelImageImportSchema } from "../lib/schemas";
import { IMAGE_UPLOAD_TYPES, saveRemoteImage, saveUploadedFile } from "../lib/upload.server";
import { parseBody } from "../lib/validate.server";

// Two ways in, both ending up as a file under UPLOAD_DIR:
// - multipart: a personal photo of the box/kit.
// - JSON { url }: copy an image a catalog provider (barcode lookup) returned,
//   because those are hotlinked retail CDN URLs that rot. Only URLs a
//   provider vouches for are fetched — never an arbitrary address, and never
//   a manufacturer's own product page image.
export async function action({ request, params }: { request: Request; params: { id: string } }) {
  const id = idParam(params);
  const existing = db.select().from(models).where(eq(models.id, id)).get();
  if (!existing) {
    return notFound();
  }

  let imageUrl: string;
  if (request.headers.get("content-type")?.includes("application/json")) {
    const { url } = parseBody(modelImageImportSchema, await request.json());
    const vouched = Object.values(providers).some((p) => p.ownsImageUrl?.(url) === true);
    if (!vouched) {
      return badRequest("unknown_image_source");
    }
    ({ url: imageUrl } = await saveRemoteImage(url, "models", String(id)));
  } else {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return badRequest("no_file");
    }
    ({ url: imageUrl } = await saveUploadedFile(file, IMAGE_UPLOAD_TYPES, "models", String(id)));
  }

  const [row] = await db
    .update(models)
    .set({ imageUrl, updatedAt: new Date().toISOString() })
    .where(eq(models.id, id))
    .returning();
  return Response.json(row, { status: 201 });
}
