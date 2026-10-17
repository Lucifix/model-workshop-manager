import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { tamiyaSpitfireLookup } from "../providers/__fixtures__/upcItemDb";

// DATABASE_URL and UPLOAD_DIR are read at module scope, so both have to be set
// before the dynamic imports below — same reasoning as credentials.test.ts.
const tmp = mkdtempSync(join(tmpdir(), "workshop-catalog-route-test-"));
process.env.DATABASE_URL = join(tmp, "test.db");
process.env.UPLOAD_DIR = join(tmp, "uploads");

let db: typeof import("../db/client.server.js").db;
let schema: typeof import("../db/schema.js");
let searchLoader: typeof import("./api.catalog.search.js").loader;
let imageAction: typeof import("./api.models.$id.image.js").action;
let resetQuotaForTests: typeof import("../providers/upcItemDbProvider.js").resetQuotaForTests;

beforeAll(async () => {
  const { runMigrations } = await import("../db/migrate.server.js");
  runMigrations();
  ({ db } = await import("../db/client.server.js"));
  schema = await import("../db/schema.js");
  ({ loader: searchLoader } = await import("./api.catalog.search.js"));
  ({ action: imageAction } = await import("./api.models.$id.image.js"));
  ({ resetQuotaForTests } = await import("../providers/upcItemDbProvider.js"));
});

beforeEach(() => {
  process.env.UPCITEMDB_ENABLED = "true";
  db.delete(schema.catalogLookupCache).run();
  resetQuotaForTests();
});

afterEach(() => {
  delete process.env.UPCITEMDB_ENABLED;
  vi.unstubAllGlobals();
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function stubFetch(...responses: Response[]) {
  const fn = vi.fn<typeof fetch>();
  for (const res of responses) {
    fn.mockResolvedValueOnce(res);
  }
  vi.stubGlobal("fetch", fn);
  return fn;
}

const search = (q: string) =>
  searchLoader({
    request: new Request(`http://x/api/catalog/search?provider=upcitemdb&q=${q}`),
  });

describe("GET /api/catalog/search", () => {
  it("returns results plus the remaining quota", async () => {
    stubFetch(Response.json(tamiyaSpitfireLookup, { headers: { "X-RateLimit-Remaining": "99" } }));
    const res = await search("4950344611195");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results[0]).toMatchObject({ kitNumber: "61119" });
    expect(body.quota).toEqual({ remaining: 99, resetsAt: undefined });
  });

  it("tells the daily limit apart from the burst limit and from an outage", async () => {
    stubFetch(Response.json({ code: "TOO_FAST" }, { status: 429 }));
    let res = await search("4950344611195");
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: "too_fast" });

    stubFetch(Response.json({ code: "SERVER_ERR" }, { status: 500 }));
    res = await search("4950344611195");
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: "unavailable" });

    stubFetch(Response.json({ code: "EXCEED_LIMIT" }, { status: 429 }));
    res = await search("4950344611195");
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: "daily_limit" });
  });
});

describe("POST /api/models/:id/image with a URL", () => {
  function importImage(id: number, url: string) {
    return imageAction({
      request: new Request(`http://x/api/models/${id}/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      }),
      params: { id: String(id) },
    });
  }

  function insertModel() {
    const [mfr] = db
      .insert(schema.manufacturers)
      .values({ name: "Tamiya", slug: `tamiya-${Math.random()}` })
      .returning()
      .all();
    const [model] = db
      .insert(schema.models)
      .values({ manufacturerId: mfr!.id, kitNumber: "61119", name: "Spitfire" })
      .returning()
      .all();
    return model!;
  }

  it("refuses URLs no catalog provider returned, without fetching them", async () => {
    const model = insertModel();
    const fetchMock = stubFetch();
    const res = await importImage(model.id, "https://example.com/not-from-a-lookup.jpg");
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "unknown_image_source" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("copies a looked-up image into uploads and points the model at it", async () => {
    const model = insertModel();
    const imageUrl = tamiyaSpitfireLookup.items[0]!.images[0]!;
    stubFetch(
      Response.json(tamiyaSpitfireLookup),
      new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), {
        headers: { "Content-Type": "image/jpeg" },
      }),
    );
    await search("4950344611195");

    const res = await importImage(model.id, imageUrl);
    expect(res.status).toBe(201);
    const row = await res.json();
    expect(row.imageUrl).toMatch(new RegExp(`^/uploads/models/${model.id}/.+\\.jpg$`));
  });
});
