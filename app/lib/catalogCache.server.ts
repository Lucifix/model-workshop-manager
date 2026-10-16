import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/client.server.js";
import { catalogLookupCache } from "../db/schema.js";

/** Returns the cached payload for (provider, key) if it's younger than the
 * TTL that `maxAgeMs` picks for it — a callback, because a "no match" should
 * expire sooner than a hit (the listing may appear later) without needing a
 * second lookup to know which one it was. */
export function readCache<T>(
  provider: string,
  key: string,
  maxAgeMs: (payload: T) => number,
  now = Date.now(),
): T | undefined {
  const row = db
    .select()
    .from(catalogLookupCache)
    .where(and(eq(catalogLookupCache.provider, provider), eq(catalogLookupCache.queryKey, key)))
    .get();
  if (!row) {
    return undefined;
  }
  let payload: T;
  try {
    payload = JSON.parse(row.response) as T;
  } catch {
    return undefined;
  }
  const age = now - Date.parse(row.fetchedAt);
  return age <= maxAgeMs(payload) ? payload : undefined;
}

export function writeCache(provider: string, key: string, payload: unknown, now = Date.now()) {
  const values = {
    provider,
    queryKey: key,
    response: JSON.stringify(payload),
    fetchedAt: new Date(now).toISOString(),
  };
  db.insert(catalogLookupCache)
    .values(values)
    .onConflictDoUpdate({
      target: [catalogLookupCache.provider, catalogLookupCache.queryKey],
      set: { response: values.response, fetchedAt: values.fetchedAt },
    })
    .run();
}

/** Whether any cached response from `provider` contains `value` as a JSON
 * string — used to check that an image URL the client asks the server to
 * download really came from that provider. Matches the JSON-encoded form
 * (quotes included) so a prefix of a longer URL doesn't count. */
export function cacheContainsString(provider: string, value: string): boolean {
  const needle = JSON.stringify(value);
  const row = db
    .select({ one: sql<number>`1` })
    .from(catalogLookupCache)
    .where(
      and(
        eq(catalogLookupCache.provider, provider),
        sql`instr(${catalogLookupCache.response}, ${needle}) > 0`,
      ),
    )
    .get();
  return row !== undefined;
}
