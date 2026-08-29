import type { CatalogProvider, ModelDetails, ModelResult, PaintResult } from "./types.js";

/**
 * Optional convenience provider around UPCitemdb's free-tier lookup API.
 * Disabled unless UPCITEMDB_ENABLED=true (see docs/DATA_SOURCES.md — generic
 * retail data, not hobby-specific, so it's a nice-to-have quick-fill, never
 * the primary catalog path). Free tier: ~100 lookups/day, no key required
 * for `prod/trial/lookup`.
 */
export function createUpcItemDbProvider(): CatalogProvider {
  const enabled = process.env.UPCITEMDB_ENABLED === "true";

  return {
    id: "upcitemdb",
    label: "Barcode lookup (UPCitemdb)",
    async searchModels(query: string): Promise<ModelResult[]> {
      if (!enabled) return [];
      const item = await lookup(query);
      if (!item) return [];
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
      if (!enabled) return null;
      const item = await lookup(externalId);
      if (!item) return null;
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
      if (!enabled) return [];
      const item = await lookup(query);
      if (!item) return [];
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
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: UpcItem[] };
    return data.items?.[0] ?? null;
  } catch {
    return null; // network unavailable / rate-limited — fail soft, never break the UI
  }
}
