import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import {
  projects,
  models,
  buildLogEntries,
  projectPhotos,
  projectPaints,
  paints,
} from "../db/schema";
import { projectUpdateSchema } from "../lib/schemas";
import { parseBody } from "../lib/validate.server";
import { notFound, badRequest, idParam } from "../lib/api.server";

export async function loader({ params }: { params: { id: string } }) {
  const id = idParam(params);
  const project = db.select().from(projects).where(eq(projects.id, id)).get();
  if (!project) {
    return notFound();
  }
  const model = db.select().from(models).where(eq(models.id, project.modelId)).get();
  const log = db
    .select()
    .from(buildLogEntries)
    .where(eq(buildLogEntries.projectId, id))
    .all()
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
  const photos = db.select().from(projectPhotos).where(eq(projectPhotos.projectId, id)).all();
  const usedPaints = db
    .select({ projectPaint: projectPaints, paint: paints })
    .from(projectPaints)
    .leftJoin(paints, eq(projectPaints.paintId, paints.id))
    .where(eq(projectPaints.projectId, id))
    .all();
  return Response.json({ ...project, model, log, photos, usedPaints });
}

export async function action({ request, params }: { request: Request; params: { id: string } }) {
  const id = idParam(params);
  const body = parseBody(projectUpdateSchema, await request.json());

  const existing = db.select().from(projects).where(eq(projects.id, id)).get();
  if (!existing) {
    return notFound();
  }

  if (body.coverPhotoId != null) {
    const photo = db
      .select()
      .from(projectPhotos)
      .where(eq(projectPhotos.id, body.coverPhotoId))
      .get();
    if (!photo || photo.projectId !== id) {
      return badRequest("invalid_cover_photo");
    }
  }

  const now = new Date().toISOString();
  const patch: typeof body & { startedAt?: string; completedAt?: string } = { ...body };
  // Minimize manual data entry: a status transition sets the matching
  // timestamp automatically, the first time only — never overwrites a value already set.
  if (body.status === "In Progress" && !existing.startedAt && !body.startedAt) {
    patch.startedAt = now;
  }
  if (body.status === "Completed" && !existing.completedAt && !body.completedAt) {
    patch.completedAt = now;
  }

  const [row] = await db
    .update(projects)
    .set({ ...patch, updatedAt: now })
    .where(eq(projects.id, id))
    .returning();
  return Response.json(row);
}
