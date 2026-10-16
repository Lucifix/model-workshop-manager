import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  noMatchLookup,
  revellTugLookup,
  tamiyaSearch,
  tamiyaSpitfireLookup,
} from "./__fixtures__/upcItemDb";

// client.server.ts reads DATABASE_URL at module scope, so it has to be set
// before the dynamic imports below — same reasoning as credentials.test.ts.
process.env.DATABASE_URL = join(mkdtempSync(join(tmpdir(), "workshop-upcitemdb-test-")), "test.db");

let db: typeof import("../db/client.server.js").db;
let appSettings: typeof import("../db/schema.js").appSettings;
let catalogLookupCache: typeof import("../db/schema.js").catalogLookupCache;
let createUpcItemDbProvider: typeof import("./upcItemDbProvider.js").createUpcItemDbProvider;
let isEnabled: typeof import("./upcItemDbProvider.js").isEnabled;
let resetQuotaForTests: typeof import("./upcItemDbProvider.js").resetQuotaForTests;
let CatalogProviderError: typeof import("./types.js").CatalogProviderError;

beforeAll(async () => {
  const { runMigrations } = await import("../db/migrate.server.js");
  runMigrations();

  ({ db } = await import("../db/client.server.js"));
  ({ appSettings, catalogLookupCache } = await import("../db/schema.js"));
  ({ createUpcItemDbProvider, isEnabled, resetQuotaForTests } =
    await import("./upcItemDbProvider.js"));
  ({ CatalogProviderError } = await import("./types.js"));
});

beforeEach(() => {
  db.delete(appSettings).run();
  db.delete(catalogLookupCache).run();
  resetQuotaForTests();
  delete process.env.UPCITEMDB_ENABLED;
});

afterEach(() => {
  delete process.env.UPCITEMDB_ENABLED;
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
}

function mockFetch(...responses: Response[]) {
  const fn = vi.fn<typeof fetch>();
  for (const res of responses) {
    fn.mockResolvedValueOnce(res);
  }
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("isEnabled", () => {
  it("is off by default, with no settings row and no env var", () => {
    expect(isEnabled()).toBe(false);
  });

  it("follows the Settings toggle once a row exists", () => {
    db.insert(appSettings).values({ id: 1, upcItemDbEnabled: true }).run();
    expect(isEnabled()).toBe(true);
  });

  it("re-checks the settings row on every call, not just at provider creation", () => {
    db.insert(appSettings).values({ id: 1, upcItemDbEnabled: false }).run();
    expect(isEnabled()).toBe(false);

    db.update(appSettings).set({ upcItemDbEnabled: true }).run();
    expect(isEnabled()).toBe(true);
  });

  it("stays enabled via UPCITEMDB_ENABLED=true even when the Settings toggle is off", () => {
    db.insert(appSettings).values({ id: 1, upcItemDbEnabled: false }).run();
    process.env.UPCITEMDB_ENABLED = "true";
    expect(isEnabled()).toBe(true);
  });
});

describe("createUpcItemDbProvider", () => {
  it("exposes enabled as a live view of isEnabled(), not a snapshot", () => {
    const provider = createUpcItemDbProvider();
    expect(provider.enabled).toBe(false);

    db.insert(appSettings).values({ id: 1, upcItemDbEnabled: true }).run();
    expect(provider.enabled).toBe(true);
  });
});

describe("searchModels", () => {
  beforeEach(() => {
    process.env.UPCITEMDB_ENABLED = "true";
  });

  it("returns nothing and makes no request while disabled", async () => {
    delete process.env.UPCITEMDB_ENABLED;
    const fetchMock = mockFetch();
    expect(await createUpcItemDbProvider().searchModels("4950344611195")).toEqual({ results: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("looks up a barcode and maps the parsed listing", async () => {
    const fetchMock = mockFetch(
      jsonResponse(tamiyaSpitfireLookup, {
        headers: { "X-RateLimit-Remaining": "42", "X-RateLimit-Reset": "1792195200" },
      }),
    );
    const provider = createUpcItemDbProvider();
    const page = await provider.searchModels("4950344611195");

    expect(String(fetchMock.mock.calls[0]![0])).toBe(
      "https://api.upcitemdb.com/prod/trial/lookup?upc=4950344611195",
    );
    expect(page.results).toEqual([
      expect.objectContaining({
        externalId: "4950344611195",
        barcode: "4950344611195",
        manufacturerName: "Tamiya",
        kitNumber: "61119",
        name: "Supermarine Spitfire Mk.I",
        scale: "1:48",
        category: "Aircraft",
        imageUrl: tamiyaSpitfireLookup.items[0]!.images[0],
        priceRange: { low: 9.99, high: 107.56 },
      }),
    ]);
    expect(page.results[0]!.sourceUrl).toBeUndefined();
    expect(provider.quota?.()).toEqual({ remaining: 42, resetsAt: "2026-10-17T00:00:00.000Z" });
  });

  it("leaves kitNumber empty rather than falling back to the barcode", async () => {
    mockFetch(
      jsonResponse({
        items: [{ ean: "4009803052397", title: "Some Toy", brand: "", model: "" }],
      }),
    );
    const { results } = await createUpcItemDbProvider().searchModels("4009803052397");
    expect(results[0]).toMatchObject({ kitNumber: "", manufacturerName: "", name: "Some Toy" });
  });

  it("serves a repeat lookup from the cache without another request", async () => {
    const fetchMock = mockFetch(jsonResponse(revellTugLookup));
    const provider = createUpcItemDbProvider();
    const first = await provider.searchModels("4009803052397");
    const second = await provider.searchModels("4009803052397");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
    expect(second.results[0]).toMatchObject({ kitNumber: "05239", name: "Tug Boat Smit Houston" });
  });

  it("caches a miss too", async () => {
    const fetchMock = mockFetch(jsonResponse(noMatchLookup));
    const provider = createUpcItemDbProvider();
    expect((await provider.searchModels("0000000000000")).results).toEqual([]);
    expect((await provider.searchModels("0000000000000")).results).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats INVALID_UPC (400) as no match, not an outage", async () => {
    mockFetch(jsonResponse({ code: "INVALID_UPC" }, { status: 400 }));
    expect((await createUpcItemDbProvider().searchModels("12345670")).results).toEqual([]);
  });

  it("text-searches non-barcode queries and groups reseller duplicates", async () => {
    const fetchMock = mockFetch(jsonResponse({ ...tamiyaSearch, total: 30 }));
    const page = await createUpcItemDbProvider().searchModels("Tamiya  61119");

    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.pathname).toBe("/prod/trial/search");
    expect(url.searchParams.get("s")).toBe("tamiya 61119");
    expect(url.searchParams.get("type")).toBe("product");
    expect(page.results.map((r) => [r.kitNumber, r.listingCount])).toEqual([
      ["61119", 3],
      ["61033", 1],
    ]);
    expect(page.nextOffset).toBe(4);
  });

  it("passes the offset through and stops paging at the end", async () => {
    const fetchMock = mockFetch(jsonResponse({ ...tamiyaSearch, total: 8, offset: 4 }));
    const page = await createUpcItemDbProvider().searchModels("tamiya 61119", { offset: 4 });
    expect(new URL(String(fetchMock.mock.calls[0]![0])).searchParams.get("offset")).toBe("4");
    expect(page.nextOffset).toBeUndefined();
  });

  it("reports the burst limit as too_fast", async () => {
    mockFetch(jsonResponse({ code: "TOO_FAST" }, { status: 429 }));
    await expect(createUpcItemDbProvider().searchModels("4950344611195")).rejects.toMatchObject({
      code: "too_fast",
    });
  });

  it("reports the daily quota as daily_limit and stops calling until it resets", async () => {
    const reset = Math.floor(Date.now() / 1000) + 3600;
    const fetchMock = mockFetch(
      jsonResponse(
        { code: "EXCEED_LIMIT" },
        {
          status: 429,
          headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": String(reset) },
        },
      ),
    );
    const provider = createUpcItemDbProvider();
    const error = await provider.searchModels("4950344611195").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CatalogProviderError);
    expect(error).toMatchObject({ code: "daily_limit" });

    await expect(provider.searchModels("4009803052397")).rejects.toMatchObject({
      code: "daily_limit",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("still answers cached queries after the quota runs out", async () => {
    const reset = Math.floor(Date.now() / 1000) + 3600;
    const fetchMock = mockFetch(
      jsonResponse(revellTugLookup, {
        headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": String(reset) },
      }),
    );
    const provider = createUpcItemDbProvider();
    await provider.searchModels("4009803052397");
    expect((await provider.searchModels("4009803052397")).results).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports network failures and 5xx as unavailable, without caching them", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValueOnce(new TypeError("fetch failed"));
    fetchMock.mockResolvedValueOnce(jsonResponse({ code: "SERVER_ERR" }, { status: 500 }));
    fetchMock.mockResolvedValueOnce(jsonResponse(revellTugLookup));
    vi.stubGlobal("fetch", fetchMock);
    const provider = createUpcItemDbProvider();

    await expect(provider.searchModels("4009803052397")).rejects.toMatchObject({
      code: "unavailable",
    });
    await expect(provider.searchModels("4009803052397")).rejects.toMatchObject({
      code: "unavailable",
    });
    expect((await provider.searchModels("4009803052397")).results).toHaveLength(1);
  });
});

describe("ownsImageUrl", () => {
  it("only vouches for image URLs that came back from a cached response", async () => {
    process.env.UPCITEMDB_ENABLED = "true";
    mockFetch(jsonResponse(tamiyaSpitfireLookup));
    const provider = createUpcItemDbProvider();
    await provider.searchModels("4950344611195");

    const onbuy = tamiyaSpitfireLookup.items[0]!.images[1]!;
    expect(provider.ownsImageUrl?.(onbuy)).toBe(true);
    expect(provider.ownsImageUrl?.(onbuy.slice(0, -4))).toBe(false);
    expect(provider.ownsImageUrl?.("http://192.168.1.1/admin")).toBe(false);
  });
});
