import { eq, and, or, like, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "../db/client.server";
import { paints, paintInventory, manufacturers } from "../db/schema";
import { paintCreateSchema } from "../lib/schemas";
import { parseBody } from "../lib/validate.server";

const DEFAULT_PAGE_SIZE = 60;
const MAX_PAGE_SIZE = 200;

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const manufacturerId = url.searchParams.get("manufacturerId") ?? undefined;
  const type = url.searchParams.get("type") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const limitRaw = url.searchParams.get("limit") ?? undefined;
  const offsetRaw = url.searchParams.get("offset") ?? undefined;

  const conditions = [];
  if (q?.trim()) {
    const needle = `%${q.trim()}%`;
    conditions.push(or(like(paints.name, needle), like(paints.productCode, needle)));
  }
  if (manufacturerId) {
    conditions.push(eq(paints.manufacturerId, Number(manufacturerId)));
  }
  if (type) {
    conditions.push(eq(paints.type, type));
  }

  if (status === "owned" || status === "not_owned") {
    const ownedIds = db
      .selectDistinct({ paintId: paintInventory.paintId })
      .from(paintInventory)
      .all()
      .map((r) => r.paintId);
    if (status === "owned") {
      conditions.push(ownedIds.length > 0 ? inArray(paints.id, ownedIds) : sql`0`);
    } else if (ownedIds.length > 0) {
      conditions.push(notInArray(paints.id, ownedIds));
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = Math.min(Math.max(Number(limitRaw) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const offset = Math.max(Number(offsetRaw) || 0, 0);

  const page = db
    .select({ paint: paints, manufacturer: manufacturers })
    .from(paints)
    .leftJoin(manufacturers, eq(paints.manufacturerId, manufacturers.id))
    .where(where)
    .orderBy(paints.name)
    .limit(limit + 1)
    .offset(offset)
    .all();

  const hasMore = page.length > limit;
  const rows = hasMore ? page.slice(0, limit) : page;

  const paintIds = rows.map((r) => r.paint.id);
  const inventoryByPaintId = new Map<number, (typeof paintInventory.$inferSelect)[]>();
  if (paintIds.length > 0) {
    for (const row of db
      .select()
      .from(paintInventory)
      .where(inArray(paintInventory.paintId, paintIds))
      .all()) {
      const list = inventoryByPaintId.get(row.paintId) ?? [];
      list.push(row);
      inventoryByPaintId.set(row.paintId, list);
    }
  }

  return Response.json({
    rows: rows.map((r) => ({ ...r, inventory: inventoryByPaintId.get(r.paint.id) ?? [] })),
    hasMore,
  });
}

export async function action({ request }: { request: Request }) {
  const body = parseBody(paintCreateSchema, await request.json());
  const [row] = await db
    .insert(paints)
    .values({ ...body, source: body.source ?? "manual" })
    .returning();
  return Response.json(row, { status: 201 });
}
