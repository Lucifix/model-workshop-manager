import { db } from "../db/client.server";
import { manufacturers, paints } from "../db/schema";
import { manufacturerCreateSchema } from "../lib/schemas";
import { parseBody } from "../lib/validate.server";

export async function loader() {
  const rows = db.select().from(manufacturers).all();
  const paintManufacturerIds = db
    .select({ manufacturerId: paints.manufacturerId })
    .from(paints)
    .all();

  const countByManufacturer = new Map<number, number>();
  for (const { manufacturerId } of paintManufacturerIds) {
    countByManufacturer.set(manufacturerId, (countByManufacturer.get(manufacturerId) ?? 0) + 1);
  }

  return Response.json(rows.map((m) => ({ ...m, paintCount: countByManufacturer.get(m.id) ?? 0 })));
}

export async function action({ request }: { request: Request }) {
  const body = parseBody(manufacturerCreateSchema, await request.json());
  const [row] = await db.insert(manufacturers).values(body).returning();
  return Response.json(row, { status: 201 });
}
