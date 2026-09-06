import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { projects, models } from "../db/schema";
import { projectCreateSchema } from "../lib/schemas";
import { parseBody } from "../lib/validate.server";
import { resolveCoverPhotoUrls } from "../lib/coverPhotos.server";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;

  let rows = db
    .select({ project: projects, model: models })
    .from(projects)
    .leftJoin(models, eq(projects.modelId, models.id))
    .all();
  if (status) {
    rows = rows.filter((r) => r.project.status === status);
  }

  const coverPhotoUrls = resolveCoverPhotoUrls(rows.map((r) => r.project));
  return Response.json(
    rows.map((r) => ({ ...r, coverPhotoUrl: coverPhotoUrls.get(r.project.id) })),
  );
}

export async function action({ request }: { request: Request }) {
  const body = parseBody(projectCreateSchema, await request.json());
  const [row] = await db.insert(projects).values(body).returning();
  return Response.json(row, { status: 201 });
}
