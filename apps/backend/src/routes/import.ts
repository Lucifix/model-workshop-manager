import type { FastifyInstance } from "fastify";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { models, paints, manufacturers, modelPaints } from "../db/schema.js";

interface CSVRow {
  [key: string]: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

/**
 * Parse CSV content. Expects standard CSV format with headers in first row.
 */
function parseCSV(content: string): CSVRow[] {
  const lines = content
    .trim()
    .split("\n")
    .filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return [];
  }

  // Parse headers, splitting by comma and trimming (preserve original casing)
  const headers = lines[0]!.split(",").map((h) => h.trim());
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    // Split by comma, trim each value, and handle quoted values
    const values = line.split(",").map((v) => {
      let trimmed = v.trim();
      // Remove surrounding quotes if present
      if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ) {
        trimmed = trimmed.slice(1, -1);
      }
      return trimmed;
    });

    const row: CSVRow = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || "";
    });
    rows.push(row);
  }

  return rows;
}

export async function importRoutes(app: FastifyInstance) {
  /**
   * Import manufacturers from CSV/JSON
   * CSV columns: name, slug, website
   * JSON: array of {name, slug, website}
   */
  app.post("/api/import/manufacturers", async (req, reply) => {
    const file = await req.file();
    if (!file) {
      return reply.code(400).send({ error: "no_file" });
    }

    const buffer = await file.toBuffer();
    const content = buffer.toString("utf-8");

    let rows: any[] = [];
    if (file.filename.endsWith(".json")) {
      rows = JSON.parse(content);
      if (!Array.isArray(rows)) {
        return reply.code(400).send({ error: "invalid_json_format" });
      }
    } else if (file.filename.endsWith(".csv")) {
      rows = parseCSV(content);
    } else {
      return reply.code(400).send({ error: "unsupported_file_type" });
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

        // Check if already exists
        const existing = db
          .select()
          .from(manufacturers)
          .where(eq(manufacturers.slug, row.slug))
          .get();
        if (existing) {
          result.skipped++;
          continue;
        }

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

    return result;
  });

  /**
   * Import paints from CSV/JSON
   * CSV columns: manufacturerId, productCode, name, type, finish, sizeMl, colorHex, colorFamily, notes
   * JSON: same structure
   */
  app.post("/api/import/paints", async (req, reply) => {
    const file = await req.file();
    if (!file) {
      return reply.code(400).send({ error: "no_file" });
    }

    const buffer = await file.toBuffer();
    const content = buffer.toString("utf-8");

    let rows: any[] = [];
    if (file.filename.endsWith(".json")) {
      rows = JSON.parse(content);
      if (!Array.isArray(rows)) {
        return reply.code(400).send({ error: "invalid_json_format" });
      }
    } else if (file.filename.endsWith(".csv")) {
      rows = parseCSV(content);
    } else {
      return reply.code(400).send({ error: "unsupported_file_type" });
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

        // Check if already exists
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

    return result;
  });

  /**
   * Import models from CSV/JSON
   * CSV columns: manufacturerId, kitNumber, name, scale, category, difficulty, partCount, description
   * JSON: same structure
   */
  app.post("/api/import/models", async (req, reply) => {
    const file = await req.file();
    if (!file) {
      return reply.code(400).send({ error: "no_file" });
    }

    const buffer = await file.toBuffer();
    const content = buffer.toString("utf-8");

    let rows: any[] = [];
    if (file.filename.endsWith(".json")) {
      rows = JSON.parse(content);
      if (!Array.isArray(rows)) {
        return reply.code(400).send({ error: "invalid_json_format" });
      }
    } else if (file.filename.endsWith(".csv")) {
      rows = parseCSV(content);
    } else {
      return reply.code(400).send({ error: "unsupported_file_type" });
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

        // Check if already exists
        const mfrId = Number(row.manufacturerId);
        const existing = db
          .select()
          .from(models)
          .where(
            sql`${models.manufacturerId} = ${mfrId} AND ${models.kitNumber} = ${row.kitNumber}`,
          )
          .get();

        if (existing) {
          result.skipped++;
          continue;
        }

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

    return result;
  });

  /**
   * Export current data as JSON for backup/sharing
   */
  app.get("/api/export/paints", async () => {
    return db.select().from(paints).all();
  });

  app.get("/api/export/models", async () => {
    return db.select().from(models).all();
  });

  app.get("/api/export/manufacturers", async () => {
    return db.select().from(manufacturers).all();
  });

  app.get("/api/export/all", async () => {
    return {
      manufacturers: db.select().from(manufacturers).all(),
      paints: db.select().from(paints).all(),
      models: db.select().from(models).all(),
      modelPaints: db.select().from(modelPaints).all(),
    };
  });
}
