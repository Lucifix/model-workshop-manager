import { sql } from "drizzle-orm";
import { db } from "../db/client.server";
import { models } from "../db/schema";
import { readUploadedRows, type ImportResult } from "../lib/csv.server";

/** Import models from CSV/JSON. Columns: manufacturerId, kitNumber, name,
 * scale, category, difficulty, partCount, description. */
export async function action({ request }: { request: Request }) {
  const { rows, error } = await readUploadedRows(request);
  if (error) {
    return error;
  }

  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      if (!row.manufacturerId || !row.kitNumber || !row.name) {
        result.errors.push({
          row: i + 1,
          error: "Missing required fields: manufacturerId, kitNumber, name",
        });
        result.skipped++;
        continue;
      }

      const mfrId = Number(row.manufacturerId);
      const existing = db
        .select()
        .from(models)
        .where(sql`${models.manufacturerId} = ${mfrId} AND ${models.kitNumber} = ${row.kitNumber}`)
        .get();

      if (existing) {
        result.skipped++;
        continue;
      }

      // oxlint-disable-next-line no-await-in-loop
      await db.insert(models).values({
        manufacturerId: mfrId,
        kitNumber: row.kitNumber,
        name: row.name,
        scale: row.scale || undefined,
        category: row.category || undefined,
        difficulty: row.difficulty || undefined,
        partCount: row.partCount ? Number(row.partCount) : undefined,
        description: row.description || undefined,
        source: row.source || "imported",
        sourceUrl: row.sourceUrl || undefined,
        imageUrl: row.imageUrl || undefined,
        instructionUrl: row.instructionUrl || undefined,
        importedAt: new Date().toISOString(),
      });
      result.imported++;
    } catch (e: any) {
      result.errors.push({ row: i + 1, error: e.message });
    }
  }

  return Response.json(result);
}
