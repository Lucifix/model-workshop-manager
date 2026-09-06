import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import {
  models,
  manufacturers,
  modelPaints,
  paints,
  paintInventory,
  ownedModels,
  projects,
  tags,
  modelTags,
} from "../db/schema";
import { modelUpdateSchema } from "../lib/schemas";
import { parseBody } from "../lib/validate.server";
import { paintAvailability } from "../lib/paintAvailability";
import { resolveCoverPhotoUrls } from "../lib/coverPhotos.server";
import { notFound, noContent, idParam } from "../lib/api.server";
import { attachTags } from "../lib/modelTags.server";

export async function loader({ params }: { params: { id: string } }) {
  const id = idParam(params);
  const model = db.select().from(models).where(eq(models.id, id)).get();
  if (!model) {
    return notFound();
  }
  const manufacturer = db
    .select()
    .from(manufacturers)
    .where(eq(manufacturers.id, model.manufacturerId))
    .get();

  const requiredPaints = db
    .select({ modelPaint: modelPaints, paint: paints })
    .from(modelPaints)
    .leftJoin(paints, eq(modelPaints.paintId, paints.id))
    .where(eq(modelPaints.modelId, id))
    .all();

  const ownedPaintIds = new Set(
    db
      .select({ paintId: paintInventory.paintId })
      .from(paintInventory)
      .all()
      .filter((r) => r.paintId != null)
      .map((r) => r.paintId as number),
  );

  const ownership = db.select().from(ownedModels).where(eq(ownedModels.modelId, id)).all();
  const projectHistory = db.select().from(projects).where(eq(projects.modelId, id)).all();
  const coverPhotoUrls = resolveCoverPhotoUrls(projectHistory);

  const modelTagRows = db
    .select({ tag: tags })
    .from(modelTags)
    .leftJoin(tags, eq(modelTags.tagId, tags.id))
    .where(eq(modelTags.modelId, id))
    .all();

  return Response.json({
    ...model,
    manufacturer,
    tags: modelTagRows
      .map((r) => r.tag)
      .filter((t): t is { id: number; name: string } => t != null),
    requiredPaints: requiredPaints.map((r) => ({
      ...r.paint,
      usage: r.modelPaint.usage,
      confidence: r.modelPaint.confidence,
      owned: r.paint ? ownedPaintIds.has(r.paint.id) : false,
    })),
    availability: paintAvailability(
      requiredPaints.map((r) => (r.paint ? ownedPaintIds.has(r.paint.id) : false)),
    ),
    ownership,
    projects: projectHistory.map((p) => ({ ...p, coverPhotoUrl: coverPhotoUrls.get(p.id) })),
  });
}

export async function action({ request, params }: { request: Request; params: { id: string } }) {
  const id = idParam(params);

  if (request.method === "PATCH") {
    const body = parseBody(modelUpdateSchema, await request.json());
    const { tagNames, ...modelData } = body;
    const [row] = await db
      .update(models)
      .set({ ...modelData, updatedAt: new Date().toISOString() })
      .where(eq(models.id, id))
      .returning();
    if (!row) {
      return notFound();
    }
    if (tagNames) {
      await db.delete(modelTags).where(eq(modelTags.modelId, id));
      if (tagNames.length > 0) {
        await attachTags(id, tagNames);
      }
    }
    return Response.json(row);
  }

  if (request.method === "DELETE") {
    await db.delete(models).where(eq(models.id, id));
    return noContent();
  }

  return new Response("Method Not Allowed", { status: 405 });
}
