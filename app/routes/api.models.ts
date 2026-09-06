import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { models, manufacturers, ownedModels, tags, modelTags } from "../db/schema";
import { modelCreateSchema } from "../lib/schemas";
import { parseBody } from "../lib/validate.server";
import { attachTags } from "../lib/modelTags.server";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const manufacturerId = url.searchParams.get("manufacturerId") ?? undefined;
  const scale = url.searchParams.get("scale") ?? undefined;
  const category = url.searchParams.get("category") ?? undefined;
  const tag = url.searchParams.get("tag") ?? undefined;

  let rows = db
    .select({ model: models, manufacturer: manufacturers })
    .from(models)
    .leftJoin(manufacturers, eq(models.manufacturerId, manufacturers.id))
    .all();

  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.model.name.toLowerCase().includes(needle) ||
        r.model.kitNumber.toLowerCase().includes(needle),
    );
  }
  if (manufacturerId) {
    rows = rows.filter((r) => r.model.manufacturerId === Number(manufacturerId));
  }
  if (scale) {
    rows = rows.filter((r) => r.model.scale === scale);
  }
  if (category) {
    rows = rows.filter((r) => r.model.category === category);
  }

  const ownershipByModelId = new Map<number, (typeof ownedModels.$inferSelect)[]>();
  for (const row of db.select().from(ownedModels).all()) {
    const list = ownershipByModelId.get(row.modelId) ?? [];
    list.push(row);
    ownershipByModelId.set(row.modelId, list);
  }

  const tagRows = db
    .select({ modelId: modelTags.modelId, tag: tags })
    .from(modelTags)
    .leftJoin(tags, eq(modelTags.tagId, tags.id))
    .all();
  const tagsByModelId = new Map<number, { id: number; name: string }[]>();
  for (const r of tagRows) {
    if (!r.tag) {
      continue;
    }
    const list = tagsByModelId.get(r.modelId) ?? [];
    list.push(r.tag);
    tagsByModelId.set(r.modelId, list);
  }
  if (tag) {
    const modelIdsWithTag = new Set(
      tagRows.filter((r) => r.tag?.name === tag).map((r) => r.modelId),
    );
    rows = rows.filter((r) => modelIdsWithTag.has(r.model.id));
  }

  return Response.json(
    rows.map((r) => ({
      ...r,
      ownership: ownershipByModelId.get(r.model.id) ?? [],
      tags: tagsByModelId.get(r.model.id) ?? [],
    })),
  );
}

export async function action({ request }: { request: Request }) {
  const body = parseBody(modelCreateSchema, await request.json());
  const { tagNames, ...modelData } = body;
  const [row] = await db
    .insert(models)
    .values({ ...modelData, source: modelData.source ?? "manual" })
    .returning();
  if (tagNames && tagNames.length > 0) {
    await attachTags(row!.id, tagNames);
  }
  return Response.json(row, { status: 201 });
}
