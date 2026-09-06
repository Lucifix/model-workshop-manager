import { eq } from "drizzle-orm";
import { join } from "node:path";
import { db } from "../db/client.server";
import { projectPhotos } from "../db/schema";
import { badRequest, idParam } from "../lib/api.server";
import { saveUploadedFile } from "../lib/upload.server";

export async function loader({ params }: { params: { id: string } }) {
  const id = idParam(params);
  return Response.json(
    db.select().from(projectPhotos).where(eq(projectPhotos.projectId, id)).all(),
  );
}

export async function action({ request, params }: { request: Request; params: { id: string } }) {
  const id = idParam(params);
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return badRequest("no_file");
  }

  const { filename } = await saveUploadedFile(file, "projects", String(id));
  const [row] = await db
    .insert(projectPhotos)
    .values({
      projectId: id,
      filename: join("projects", String(id), filename),
      originalFilename: file.name,
    })
    .returning();
  return Response.json(row, { status: 201 });
}
