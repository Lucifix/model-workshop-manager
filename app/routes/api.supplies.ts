import { eq, and, like } from "drizzle-orm";
import { db } from "../db/client.server";
import { supplies } from "../db/schema";
import { supplyCreateSchema } from "../lib/schemas";
import { parseBody } from "../lib/validate.server";

const LOW_STOCK_THRESHOLD = 1;

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const category = url.searchParams.get("category") ?? undefined;
  const lowStock = url.searchParams.get("lowStock") ?? undefined;

  const conditions = [];
  if (q?.trim()) {
    conditions.push(like(supplies.name, `%${q.trim()}%`));
  }
  if (category) {
    conditions.push(eq(supplies.category, category));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  let rows = db.select().from(supplies).where(where).orderBy(supplies.name).all();
  if (lowStock === "true") {
    rows = rows.filter((r) => r.quantity <= LOW_STOCK_THRESHOLD);
  }
  return Response.json(rows);
}

export async function action({ request }: { request: Request }) {
  const body = parseBody(supplyCreateSchema, await request.json());
  const [row] = await db.insert(supplies).values(body).returning();
  return Response.json(row, { status: 201 });
}
