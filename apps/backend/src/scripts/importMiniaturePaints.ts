import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { manufacturers, paints, PAINT_TYPES } from "../db/schema.js";

/**
 * One-time bulk import of paint color data (names, product codes, hex
 * colors) from the MIT-licensed community dataset at
 * https://github.com/Arcturus5404/miniature-paints.
 *
 * Deliberately data-only: this script does NOT download or store the
 * repository's manufacturer logo images. Those are each manufacturer's own
 * trademarked artwork — the repo's MIT license covers its own compilation,
 * not third-party marks it doesn't hold the copyright to. See docs/ORIGINAL_SPEC.md
 * §36. Add a logo per-manufacturer yourself (paste a URL or upload a file)
 * if you want one, same as the existing model-image workflow.
 *
 * Run with: npm run import:miniature-paints
 */

const REPO = "Arcturus5404/miniature-paints";
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/main`;

// This dataset's naive filename-derived slug doesn't always match the slug
// already seeded in this app for the same real-world brand — merge into it.
const SLUG_ALIASES: Record<string, string> = {
  ak: "ak-interactive",
};

type PaintType = (typeof PAINT_TYPES)[number];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function displayNameFromFile(stem: string): string {
  const spaced = stem.replace(/_/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.replace(/\s+/g, " ").trim();
}

function inferType(setLabel: string): PaintType {
  const s = setLabel.toLowerCase();
  if (s.includes("primer")) return "Primer";
  if (s.includes("panel liner") || s.includes("panel line")) return "Panel Liner";
  if (s.includes("wash") || s.includes("shade")) return "Wash";
  if (s.includes("metallic") || s.includes("metal")) return "Metallic";
  if (s.includes("weathering") || s.includes("pigment") || s.includes("technical") || s.includes("rust"))
    return "Weathering";
  if (s.includes("enamel")) return "Enamel";
  if (s.includes("lacquer")) return "Lacquer";
  return "Acrylic";
}

interface ParsedRow {
  name: string;
  code?: string;
  set: string;
  hex?: string;
}

/** Parses the `|Name|Code?|Set|R|G|B|Hex|` markdown table each brand file uses. */
function parsePaintTable(markdown: string): ParsedRow[] {
  const lines = markdown.split("\n");
  const headerIdx = lines.findIndex((l) => l.trim().startsWith("|") && l.toLowerCase().includes("name"));
  if (headerIdx === -1) return [];

  const headers = lines[headerIdx]!
    .split("|")
    .map((h) => h.trim().toLowerCase())
    .filter((h) => h.length > 0);
  const nameIdx = headers.indexOf("name");
  const codeIdx = headers.indexOf("code");
  const setIdx = headers.indexOf("set");
  const hexIdx = headers.indexOf("hex");

  const rows: ParsedRow[] = [];
  for (let i = headerIdx + 2; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim());
    const cols = cells.slice(1, cells.length - 1);
    const name = cols[nameIdx]?.trim();
    if (!name) continue;

    const hexMatch = hexIdx >= 0 ? cols[hexIdx]?.match(/#([0-9A-Fa-f]{6})/) : null;
    rows.push({
      name,
      code: codeIdx >= 0 ? cols[codeIdx]?.trim() || undefined : undefined,
      set: setIdx >= 0 ? (cols[setIdx]?.trim() ?? "") : "",
      hex: hexMatch ? `#${hexMatch[1]!.toUpperCase()}` : undefined,
    });
  }
  return rows;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed ${res.status}: ${url}`);
  return res.text();
}

async function upsertManufacturer(name: string, slug: string): Promise<{ id: number; created: boolean }> {
  const existing = db.select().from(manufacturers).where(eq(manufacturers.slug, slug)).get();
  if (existing) return { id: existing.id, created: false };
  const [row] = await db.insert(manufacturers).values({ name, slug }).returning();
  return { id: row!.id, created: true };
}

async function main() {
  console.log(`Fetching brand file list from github.com/${REPO}...`);
  const listRes = await fetch(`https://api.github.com/repos/${REPO}/contents/paints`);
  if (!listRes.ok) throw new Error(`Failed to list paints/ directory: ${listRes.status}`);
  const files = (await listRes.json()) as Array<{ name: string }>;
  const mdFiles = files.filter((f) => f.name.endsWith(".md")).map((f) => f.name);
  console.log(`Found ${mdFiles.length} brand files.\n`);

  let manufacturersCreated = 0;
  let paintsImported = 0;
  let paintsSkipped = 0;
  const errors: string[] = [];

  for (const file of mdFiles) {
    const stem = file.replace(/\.md$/, "");
    const displayName = displayNameFromFile(stem);
    const slug = SLUG_ALIASES[slugify(stem)] ?? slugify(displayName);
    const sourceUrl = `https://github.com/${REPO}/blob/main/paints/${file}`;

    try {
      const markdown = await fetchText(`${RAW_BASE}/paints/${file}`);
      const rows = parsePaintTable(markdown);

      const { id: mfrId, created } = await upsertManufacturer(displayName, slug);
      if (created) manufacturersCreated++;

      const existingCodes = new Set(
        db
          .select({ code: paints.productCode })
          .from(paints)
          .where(eq(paints.manufacturerId, mfrId))
          .all()
          .map((r) => r.code)
      );

      // Collect and batch-insert rather than one insert() per row — better-sqlite3
      // crashes under Node 24 when a loop creates thousands of individual
      // prepared statements (see run notes in docs/ORIGINAL_SPEC.md §36).
      const now = new Date().toISOString();
      const toInsert: (typeof paints.$inferInsert)[] = [];
      for (const row of rows) {
        const code = row.code?.trim() || slugify(row.name);
        if (existingCodes.has(code)) {
          paintsSkipped++;
          continue;
        }
        existingCodes.add(code);
        toInsert.push({
          manufacturerId: mfrId,
          productCode: code,
          name: row.name,
          type: inferType(row.set),
          colorHex: row.hex,
          notes: row.set ? `Line: ${row.set}` : undefined,
          source: "community-import:miniature-paints",
          sourceUrl,
          importedAt: now,
        });
      }

      const CHUNK_SIZE = 200;
      for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
        const chunk = toInsert.slice(i, i + CHUNK_SIZE);
        try {
          await db.insert(paints).values(chunk);
          paintsImported += chunk.length;
        } catch (e: any) {
          errors.push(`${displayName} (rows ${i}-${i + chunk.length}): ${e.message}`);
        }
      }
      console.log(`${displayName.padEnd(24)} +${toInsert.length} paints (${rows.length} in file)`);
    } catch (e: any) {
      errors.push(`${file}: ${e.message}`);
      console.log(`${displayName.padEnd(24)} FAILED: ${e.message}`);
    }
  }

  console.log("\n--- Import summary ---");
  console.log(`Manufacturers created: ${manufacturersCreated}`);
  console.log(`Paints imported:       ${paintsImported}`);
  console.log(`Paints skipped (dupe): ${paintsSkipped}`);
  console.log(`Errors:                ${errors.length}`);
  if (errors.length > 0) {
    console.log("\nErrors:");
    for (const e of errors.slice(0, 20)) console.log(`  - ${e}`);
    if (errors.length > 20) console.log(`  ...and ${errors.length - 20} more`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
