import { eq } from "drizzle-orm";
import { unlink } from "node:fs";
import { join } from "node:path";
import { db } from "../db/client.server";
import { projectPhotos } from "../db/schema";
import { notFound, noContent, idParam } from "../lib/api.server";
import { UPLOAD_DIR } from "../lib/upload.server";

export async function action({ params }: { params: { photoId: string } }) {
  const photoId = idParam(params, "photoId");
  const photo = db.select().from(projectPhotos).where(eq(projectPhotos.id, photoId)).get();
  if (!photo) {
    return notFound();
  }

  await db.delete(projectPhotos).where(eq(projectPhotos.id, photoId));
  unlink(join(UPLOAD_DIR, photo.filename), () => {
    // best-effort — the DB row is the source of truth; a missing file is not an error
  });
  return noContent();
}
