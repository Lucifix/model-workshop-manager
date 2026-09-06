import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { manufacturers } from "../db/schema";
import { readUploadedRows, type ImportResult } from "../lib/csv.server";

/** Import manufacturers from CSV/JSON. CSV columns: name, slug, website. */
export async function action({ request }: { request: Request }) {
  const { rows, error } = await readUploadedRows(request);
  if (error) {
    return error;
  }

  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      if (!row.name || !row.slug) {
        result.errors.push({ row: i + 1, error: "Missing required fields: name, slug" });
        result.skipped++;
        continue;
      }

      const existing = db
        .select()
        .from(manufacturers)
        .where(eq(manufacturers.slug, row.slug))
        .get();
      if (existing) {
        result.skipped++;
        continue;
      }

      // oxlint-disable-next-line no-await-in-loop
      await db.insert(manufacturers).values({
        name: row.name,
        slug: row.slug,
        website: row.website || undefined,
      });
      result.imported++;
    } catch (e: any) {
      result.errors.push({ row: i + 1, error: e.message });
    }
  }

  return Response.json(result);
}
