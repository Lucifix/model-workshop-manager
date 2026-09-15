import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

// client.server.ts reads DATABASE_URL at module scope, so it has to be set
// before the dynamic imports below — same reasoning as credentials.test.ts.
process.env.DATABASE_URL = join(mkdtempSync(join(tmpdir(), "workshop-dashboard-test-")), "test.db");

let db: typeof import("../db/client.server.js").db;
let manufacturers: typeof import("../db/schema.js").manufacturers;
let paints: typeof import("../db/schema.js").paints;
let paintInventory: typeof import("../db/schema.js").paintInventory;
let loader: typeof import("./api.dashboard.js").loader;

beforeAll(async () => {
  const { runMigrations } = await import("../db/migrate.server.js");
  runMigrations();

  ({ db } = await import("../db/client.server.js"));
  ({ manufacturers, paints, paintInventory } = await import("../db/schema.js"));
  ({ loader } = await import("./api.dashboard.js"));
});

beforeEach(() => {
  db.delete(paintInventory).run();
  db.delete(paints).run();
  db.delete(manufacturers).run();
});

describe("dashboard loader paint stats", () => {
  it("reports an empty catalog and zero owned paints with no paints at all", async () => {
    const res = await loader();
    const data = await res.json();

    expect(data.paintCatalogIsEmpty).toBe(true);
    expect(data.totalPaints).toBe(0);
  });

  it("counts paints with inventory as owned, not the whole catalog", async () => {
    const [mfr] = await db
      .insert(manufacturers)
      .values({ name: "Tamiya", slug: "tamiya" })
      .returning();
    if (!mfr) {
      throw new Error("insert failed");
    }
    const [ownedPaint] = await db
      .insert(paints)
      .values({ manufacturerId: mfr.id, productCode: "XF-1", name: "Flat Black", type: "Acrylic" })
      .returning();
    if (!ownedPaint) {
      throw new Error("insert failed");
    }
    await db
      .insert(paints)
      .values({ manufacturerId: mfr.id, productCode: "XF-2", name: "Flat White", type: "Acrylic" })
      .returning();
    await db.insert(paintInventory).values({ paintId: ownedPaint.id }).run();

    const res = await loader();
    const data = await res.json();

    // Catalog has 2 paints, but only 1 has an inventory row.
    expect(data.paintCatalogIsEmpty).toBe(false);
    expect(data.totalPaints).toBe(1);
  });
});
