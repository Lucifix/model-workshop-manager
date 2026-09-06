import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { wishlistItems, paints } from "../db/schema";
import { wishlistCreateSchema } from "../lib/schemas";
import { parseBody } from "../lib/validate.server";

export async function loader() {
  return Response.json(
    db
      .select({ item: wishlistItems, paint: paints })
      .from(wishlistItems)
      .leftJoin(paints, eq(wishlistItems.paintId, paints.id))
      .all(),
  );
}

export async function action({ request }: { request: Request }) {
  const body = parseBody(wishlistCreateSchema, await request.json());
  const [row] = await db.insert(wishlistItems).values(body).returning();
  return Response.json(row, { status: 201 });
}
