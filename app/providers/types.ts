/**
 * Generic provider interface. Every catalog data source — however it gets its
 * data in (manual entry, CSV import, an optional barcode lookup, or a future
 * official manufacturer API if one is ever published) — implements this same
 * small surface. Route handlers depend only on this interface, never on a
 * specific provider, so adding a new source never touches core app code.
 *
 * No automated manufacturer/aggregator scraper is wired up by default —
 * scraping a manufacturer site directly risks breaking their ToS/rate limits,
 * so any such source should stay opt-in and feature-flagged (see
 * upcItemDbProvider.ts for the pattern).
 */

export interface ModelResult {
  externalId: string;
  /** Empty string when the source doesn't know — never a placeholder like
   * "Unknown", which would otherwise get created as a real manufacturer. */
  manufacturerName: string;
  /** Empty string when unknown. Never the barcode itself. */
  kitNumber: string;
  name: string;
  scale?: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  /** Every candidate image, so the user can pick the right one — retail
   * listings often lead with a lifestyle shot or a different kit's box. */
  imageUrls?: string[];
  sourceUrl?: string;
  barcode?: string;
  /** All barcodes grouped under this result: text search returns the same
   * kit several times over under different reseller UPCs. */
  barcodes?: string[];
  listingCount?: number;
  /** Lowest/highest price the source has ever recorded — informational. */
  priceRange?: { low: number; high: number };
}

export interface ModelDetails extends ModelResult {
  difficulty?: string;
  partCount?: number;
  instructionUrl?: string;
}

export interface ModelSearchPage {
  results: ModelResult[];
  /** Pass back as `offset` to fetch the next page; absent on the last page. */
  nextOffset?: number;
}

export interface ProviderQuota {
  remaining: number;
  resetsAt?: string;
}

export type CatalogProviderErrorCode = "daily_limit" | "too_fast" | "unavailable";

/** Thrown by providers for failures the user should see distinctly from
 * "no match" — above all running out of a free tier's daily quota. */
export class CatalogProviderError extends Error {
  constructor(
    readonly code: CatalogProviderErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = "CatalogProviderError";
  }
}

export interface PaintResult {
  externalId: string;
  manufacturerName: string;
  productCode: string;
  name: string;
  type?: string;
  finish?: string;
  sizeMl?: number;
  colorHex?: string;
  sourceUrl?: string;
}

export interface CatalogProvider {
  id: string;
  label: string;
  /** Whether this provider is actually usable right now (e.g. its feature flag is on). Defaults to true. */
  enabled?: boolean;
  searchModels(query: string, options?: { offset?: number }): Promise<ModelSearchPage>;
  getModel(externalId: string): Promise<ModelDetails | null>;
  searchPaints(query: string): Promise<PaintResult[]>;
  /** Last known remaining API quota, for providers with a metered free tier. */
  quota?(): ProviderQuota | null;
  /** Whether `url` is an image this provider itself returned. The server only
   * downloads remote images that pass this check, so it can't be used to
   * fetch arbitrary URLs (or a manufacturer's own site — see above). */
  ownsImageUrl?(url: string): boolean;
}
