import { eq } from "drizzle-orm";
import { db } from "../db/client.server.js";
import { appSettings } from "../db/schema.js";
import type { CatalogProvider, ModelDetails, ModelResult, PaintResult } from "./types.js";

/**
 * Optional convenience provider around UPCitemdb's free-tier lookup API.
 * Off unless enabled via Settings (or UPCITEMDB_ENABLED=true, kept as a
 * back-compat override so deployments that already set the env var don't
 * lose the feature on upgrade — see isEnabled below) — generic retail data,
 * not hobby-specific, so it's a nice-to-have quick-fill, never the primary
 * catalog path. Free tier: ~100 lookups/day, no key required for
 * `prod/trial/lookup`.
 */
export function createUpcItemDbProvider(): CatalogProvider {
  return {
    id: "upcitemdb",
    label: "Barcode lookup (UPCitemdb)",
    get enabled() {
      return isEnabled();
    },
    async searchModels(query: string): Promise<ModelResult[]> {
      if (!isEnabled()) {
        return [];
      }
      const item = await lookup(query);
      if (!item) {
        return [];
      }
      return [
        {
          externalId: item.upc,
          manufacturerName: item.brand ?? "Unknown",
          kitNumber: query,
          name: item.title,
          imageUrl: item.images?.[0],
        },
      ];
    },
    async getModel(externalId: string): Promise<ModelDetails | null> {
      if (!isEnabled()) {
        return null;
      }
      const item = await lookup(externalId);
      if (!item) {
        return null;
      }
      return {
        externalId: item.upc,
        manufacturerName: item.brand ?? "Unknown",
        kitNumber: externalId,
        name: item.title,
        imageUrl: item.images?.[0],
        description: item.description,
      };
    },
    async searchPaints(query: string): Promise<PaintResult[]> {
      if (!isEnabled()) {
        return [];
      }
      const item = await lookup(query);
      if (!item) {
        return [];
      }
      return [
        {
          externalId: item.upc,
          manufacturerName: item.brand ?? "Unknown",
          productCode: query,
          name: item.title,
        },
      ];
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

interface UpcItem {
  upc: string;
  title: string;
  brand?: string;
  description?: string;
  images?: string[];
}

async function lookup(code: string): Promise<UpcItem | null> {
  try {
    const res = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`,
    );
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as { items?: UpcItem[] };
    return data.items?.[0] ?? null;
  } catch {
    return null; // network unavailable / rate-limited — fail soft, never break the UI
  }
}
