export interface CSVRow {
  [key: string]: string;
}

/** Parse CSV content. Expects standard CSV format with headers in first row. */
export function parseCSV(content: string): CSVRow[] {
  const lines = content
    .trim()
    .split("\n")
    .filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0]!.split(",").map((h) => h.trim());
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    const values = line.split(",").map((v) => {
      let trimmed = v.trim();
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

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

export async function readUploadedRows(
  request: Request,
): Promise<{ rows: any[]; error?: Response }> {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { rows: [], error: Response.json({ error: "no_file" }, { status: 400 }) };
  }

  const content = await file.text();

  if (file.name.endsWith(".json")) {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      return { rows: [], error: Response.json({ error: "invalid_json_format" }, { status: 400 }) };
    }
    return { rows: parsed };
  }
  if (file.name.endsWith(".csv")) {
    return { rows: parseCSV(content) };
  }
  return { rows: [], error: Response.json({ error: "unsupported_file_type" }, { status: 400 }) };
}
