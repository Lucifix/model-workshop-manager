import { parse } from "node:path";

/**
 * Bulk import path for catalog data the user assembles themselves — a
 * spreadsheet they maintain, an export from another tool, or hand-copied
 * data from a reference site like Scalemates (never automated scraping of
 * that site; see docs/DATA_SOURCES.md).
 *
 * This is intentionally NOT a `CatalogProvider` implementation (it has no
 * "search" concept): it's a one-shot upsert job over a documented row shape.
 */

export interface CsvModelRow {
  manufacturer: string;
  kit_number: string;
  name: string;
  scale?: string;
  category?: string;
  difficulty?: string;
  part_count?: string;
  description?: string;
  source_url?: string;
  image_url?: string;
  instruction_url?: string;
}

export interface CsvPaintRow {
  manufacturer: string;
  product_code: string;
  name: string;
  type?: string;
  finish?: string;
  size_ml?: string;
  color_hex?: string;
  color_family?: string;
  notes?: string;
  source_url?: string;
}

/** Minimal dependency-free CSV parser for the documented column set above. */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = splitCsvLine(lines[0]!);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    header.forEach((key, i) => {
      row[key.trim()] = (cells[i] ?? "").trim();
    });
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/** Derives a stable `source` label for provenance tracking (spec §22). */
export function sourceLabelForFile(originalFilename: string): string {
  const { name } = parse(originalFilename);
  return `csv-import:${name}`;
}
