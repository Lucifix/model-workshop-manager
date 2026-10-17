import { eq } from "drizzle-orm";
import { db } from "../db/client.server.js";
import { appSettings } from "../db/schema.js";
import { cacheContainsString, readCache, writeCache } from "../lib/catalogCache.server.js";
import { isBarcode } from "../lib/modelFields.js";
import {
  CatalogProviderError,
  type CatalogProvider,
  type ModelDetails,
  type ModelResult,
  type PaintResult,
  type ProviderQuota,
} from "./types.js";
import { groupKits, parseUpcItem, type KitGroup, type UpcItem } from "./upcItemDbParse.js";

/**
 * Optional convenience provider around UPCitemdb's free-tier API.
 * Off unless enabled via Settings (or UPCITEMDB_ENABLED=true, kept as a
 * back-compat override so deployments that already set the env var don't
 * lose the feature on upgrade — see isEnabled below) — generic retail data,
 * not hobby-specific, so it's a nice-to-have quick-fill, never the primary
 * catalog path. Free tier: 100 calls/day shared by lookup and search, plus a
 * short burst limit; no key required for the `prod/trial/*` endpoints.
 */

const PROVIDER_ID = "upcitemdb";
const API_BASE = "https://api.upcitemdb.com/prod/trial";
const DAY_MS = 24 * 60 * 60 * 1000;
// Kit listings barely change, and every call spends 1% of the daily quota.
const HIT_TTL_MS = 30 * DAY_MS;
// Shorter for misses: a listing can show up later, but re-scanning the same
// unknown barcode five times in a row shouldn't cost five calls.
const MISS_TTL_MS = 3 * DAY_MS;
const REQUEST_TIMEOUT_MS = 10_000;

interface UpcResponse {
  items: UpcItem[];
  total?: number;
  offset?: number;
}

let lastQuota: ProviderQuota | null = null;

export function createUpcItemDbProvider(): CatalogProvider {
  return {
    id: PROVIDER_ID,
    label: "Barcode lookup (UPCitemdb)",
    get enabled() {
      return isEnabled();
    },
    async searchModels(query, options) {
      if (!isEnabled()) {
        return { results: [] };
      }
      const q = query.trim();
      if (isBarcode(q)) {
        const data = await lookup(q);
        return { results: groupKits(data.items.map(parseUpcItem)).map(toModelResult) };
      }
      const offset = Math.max(0, Math.floor(options?.offset ?? 0));
      const data = await search(q, offset);
      const next = offset + data.items.length;
      return {
        results: groupKits(data.items.map(parseUpcItem)).map(toModelResult),
        nextOffset: data.items.length > 0 && (data.total ?? 0) > next ? next : undefined,
      };
    },
    async getModel(externalId: string): Promise<ModelDetails | null> {
      if (!isEnabled() || !isBarcode(externalId)) {
        return null;
      }
      const item = (await lookup(externalId)).items[0];
      return item ? toModelResult(withBarcodes(parseUpcItem(item))) : null;
    },
    async searchPaints(query: string): Promise<PaintResult[]> {
      if (!isEnabled() || !isBarcode(query)) {
        return [];
      }
      const item = (await lookup(query.trim())).items[0];
      if (!item?.title) {
        return [];
      }
      return [
        {
          externalId: item.ean ?? item.upc ?? query,
          manufacturerName: item.brand ?? "",
          productCode: query,
          name: item.title,
        },
      ];
    },
    quota() {
      return lastQuota;
    },
    ownsImageUrl(url: string) {
      return cacheContainsString(PROVIDER_ID, url);
    },
  };
}

/** Re-checked on every call (not cached at module load) so flipping the
 * Settings toggle takes effect without a restart. */
export function isEnabled(): boolean {
  if (process.env.UPCITEMDB_ENABLED === "true") {
    return true;
  }
  const row = db.select().from(appSettings).where(eq(appSettings.id, 1)).get();
  return row?.upcItemDbEnabled ?? false;
}

/** Test hook: the quota snapshot is module state, so tests reset it. */
export function resetQuotaForTests() {
  lastQuota = null;
}

function withBarcodes(kit: ReturnType<typeof parseUpcItem>): KitGroup {
  return { ...kit, barcodes: kit.barcode ? [kit.barcode] : [], listingCount: 1 };
}

function toModelResult(kit: KitGroup): ModelResult {
  return {
    externalId: kit.barcode,
    manufacturerName: kit.manufacturerName ?? "",
    kitNumber: kit.kitNumber ?? "",
    name: kit.name,
    scale: kit.scale,
    category: kit.category,
    description: kit.description,
    imageUrl: kit.images[0],
    imageUrls: kit.images,
    barcode: kit.barcode || undefined,
    barcodes: kit.barcodes,
    listingCount: kit.listingCount,
    priceRange: kit.priceRange,
  };
}

function lookup(code: string): Promise<UpcResponse> {
  return cachedCall(`lookup:${code}`, `${API_BASE}/lookup?upc=${encodeURIComponent(code)}`);
}

function search(query: string, offset: number): Promise<UpcResponse> {
  const normalised = query.toLowerCase().replace(/\s+/g, " ");
  const params = new URLSearchParams({ s: normalised, type: "product" });
  if (offset > 0) {
    params.set("offset", String(offset));
  }
  return cachedCall(`search:${normalised}:${offset}`, `${API_BASE}/search?${params}`);
}

async function cachedCall(key: string, url: string): Promise<UpcResponse> {
  const cached = readCache<UpcResponse>(PROVIDER_ID, key, (p) =>
    p.items.length > 0 ? HIT_TTL_MS : MISS_TTL_MS,
  );
  if (cached) {
    return cached;
  }
  // Known to be out of quota: answer locally instead of spending a request
  // just to be told so again.
  if (
    lastQuota?.remaining === 0 &&
    lastQuota.resetsAt &&
    Date.parse(lastQuota.resetsAt) > Date.now()
  ) {
    throw new CatalogProviderError("daily_limit");
  }

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new CatalogProviderError("unavailable");
  }
  recordQuota(res.headers);

  const body = (await res.json().catch(() => null)) as
    | (Partial<UpcResponse> & { code?: string; message?: string })
    | null;

  if (res.status === 429) {
    // Two different 429s: TOO_FAST is the per-minute burst limit (retry in
    // a moment); anything else (EXCEED_LIMIT) is the daily quota.
    if (body?.code === "TOO_FAST") {
      throw new CatalogProviderError("too_fast");
    }
    lastQuota = { remaining: 0, resetsAt: lastQuota?.resetsAt };
    throw new CatalogProviderError("daily_limit");
  }
  // 400 INVALID_UPC / INVALID_QUERY and 404 just mean "nothing for this" —
  // cache them as a miss like an empty 200, rather than an outage.
  if (res.status === 400 || res.status === 404) {
    const miss: UpcResponse = { items: [], total: 0, offset: 0 };
    writeCache(PROVIDER_ID, key, miss);
    return miss;
  }
  if (!res.ok || !body) {
    throw new CatalogProviderError("unavailable");
  }

  const payload: UpcResponse = {
    items: Array.isArray(body.items) ? body.items : [],
    total: typeof body.total === "number" ? body.total : undefined,
    offset: typeof body.offset === "number" ? body.offset : undefined,
  };
  writeCache(PROVIDER_ID, key, payload);
  return payload;
}

function recordQuota(headers: Headers) {
  const remaining = Number(headers.get("x-ratelimit-remaining"));
  if (headers.get("x-ratelimit-remaining") === null || !Number.isFinite(remaining)) {
    return;
  }
  // X-RateLimit-Reset is a unix timestamp in seconds.
  const reset = Number(headers.get("x-ratelimit-reset"));
  lastQuota = {
    remaining,
    resetsAt:
      Number.isFinite(reset) && reset > 0 ? new Date(reset * 1000).toISOString() : undefined,
  };
}
