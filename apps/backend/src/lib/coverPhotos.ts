import { inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { projectPhotos } from "../db/schema.js";

/** Resolves a display photo per project: the pinned cover photo if set,
 * otherwise the most recently uploaded photo, otherwise none. */
export function resolveCoverPhotoUrls(
  rows: { id: number; coverPhotoId?: number | null }[],
): Map<number, string> {
  const projectIds = rows.map((r) => r.id);
  const result = new Map<number, string>();
  if (projectIds.length === 0) return result;

  const photosByProject = new Map<number, (typeof projectPhotos.$inferSelect)[]>();
  for (const photo of db.select().from(projectPhotos).where(inArray(projectPhotos.projectId, projectIds)).all()) {
    const list = photosByProject.get(photo.projectId) ?? [];
    list.push(photo);
    photosByProject.set(photo.projectId, list);
  }

  for (const row of rows) {
    const photos = photosByProject.get(row.id);
    if (!photos || photos.length === 0) continue;
    const cover = row.coverPhotoId ? photos.find((p) => p.id === row.coverPhotoId) : undefined;
    const mostRecent = photos.reduce((a, b) => (b.id > a.id ? b : a));
    const chosen = cover ?? mostRecent;
    result.set(row.id, `/uploads/${chosen.filename}`);
  }

  return result;
}
