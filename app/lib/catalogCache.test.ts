import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

// client.server.ts reads DATABASE_URL at module scope, so it has to be set
// before the dynamic imports below — same reasoning as credentials.test.ts.
process.env.DATABASE_URL = join(
  mkdtempSync(join(tmpdir(), "workshop-catalog-cache-test-")),
  "test.db",
);

let db: typeof import("../db/client.server.js").db;
let catalogLookupCache: typeof import("../db/schema.js").catalogLookupCache;
let cache: typeof import("./catalogCache.server.js");

beforeAll(async () => {
  const { runMigrations } = await import("../db/migrate.server.js");
  runMigrations();
  ({ db } = await import("../db/client.server.js"));
  ({ catalogLookupCache } = await import("../db/schema.js"));
  cache = await import("./catalogCache.server.js");
});

beforeEach(() => {
  db.delete(catalogLookupCache).run();
});

const HOUR = 60 * 60 * 1000;
const t0 = Date.parse("2026-10-16T12:00:00Z");

describe("catalog lookup cache", () => {
  it("round-trips a payload within its TTL", () => {
    cache.writeCache("upcitemdb", "lookup:1", { items: [1] }, t0);
    expect(cache.readCache("upcitemdb", "lookup:1", () => HOUR, t0 + HOUR - 1)).toEqual({
      items: [1],
    });
  });

  it("treats an entry older than its TTL as missing", () => {
    cache.writeCache("upcitemdb", "lookup:1", { items: [1] }, t0);
    expect(cache.readCache("upcitemdb", "lookup:1", () => HOUR, t0 + HOUR + 1)).toBeUndefined();
  });

  it("lets the TTL depend on the payload (hits outlive misses)", () => {
    const ttl = (p: { items: unknown[] }) => (p.items.length > 0 ? 10 * HOUR : HOUR);
    cache.writeCache("upcitemdb", "hit", { items: [1] }, t0);
    cache.writeCache("upcitemdb", "miss", { items: [] }, t0);
    expect(cache.readCache("upcitemdb", "hit", ttl, t0 + 2 * HOUR)).toBeDefined();
    expect(cache.readCache("upcitemdb", "miss", ttl, t0 + 2 * HOUR)).toBeUndefined();
  });

  it("overwrites an existing key and refreshes its timestamp", () => {
    cache.writeCache("upcitemdb", "k", { v: 1 }, t0);
    cache.writeCache("upcitemdb", "k", { v: 2 }, t0 + 5 * HOUR);
    expect(cache.readCache("upcitemdb", "k", () => HOUR, t0 + 5.5 * HOUR)).toEqual({ v: 2 });
    expect(db.select().from(catalogLookupCache).all()).toHaveLength(1);
  });

  it("keys entries per provider", () => {
    cache.writeCache("a", "k", { v: "a" }, t0);
    expect(cache.readCache("b", "k", () => HOUR, t0)).toBeUndefined();
  });

  it("matches whole JSON strings only in cacheContainsString", () => {
    cache.writeCache("upcitemdb", "k", { images: ["https://x.test/a.jpg"] }, t0);
    expect(cache.cacheContainsString("upcitemdb", "https://x.test/a.jpg")).toBe(true);
    expect(cache.cacheContainsString("upcitemdb", "https://x.test/a")).toBe(false);
    expect(cache.cacheContainsString("other", "https://x.test/a.jpg")).toBe(false);
  });
});
