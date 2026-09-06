import { sql } from "drizzle-orm";
import { db } from "../db/client.server";
import { paints } from "../db/schema";
import { readUploadedRows, type ImportResult } from "../lib/csv.server";

/** Import paints from CSV/JSON. Columns: manufacturerId, productCode, name,
 * type, finish, sizeMl, colorHex, colorFamily, notes. */
export async function action({ request }: { request: Request }) {
  const { rows, error } = await readUploadedRows(request);
  if (error) {
    return error;
  }

  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      if (!row.manufacturerId || !row.productCode || !row.name || !row.type) {
        result.errors.push({
          row: i + 1,
          error: "Missing required fields: manufacturerId, productCode, name, type",
        });
        result.skipped++;
        continue;
      }

      const mfrId = Number(row.manufacturerId);
      const existing = db
        .select()
        .from(paints)
        .where(
          sql`${paints.manufacturerId} = ${mfrId} AND ${paints.productCode} = ${row.productCode}`,
        )
        .get();

      if (existing) {
        result.skipped++;
        continue;
      }

      // oxlint-disable-next-line no-await-in-loop
      await db.insert(paints).values({
        manufacturerId: mfrId,
        productCode: row.productCode,
        name: row.name,
        type: row.type,
        finish: row.finish || undefined,
        sizeMl: row.sizeMl ? Number(row.sizeMl) : undefined,
        colorHex: row.colorHex || undefined,
        colorFamily: row.colorFamily || undefined,
        notes: row.notes || undefined,
        source: row.source || "imported",
        sourceUrl: row.sourceUrl || undefined,
        importedAt: new Date().toISOString(),
      });
      result.imported++;
    } catch (e: any) {
      result.errors.push({ row: i + 1, error: e.message });
    }
  }

  return Response.json(result);
}
