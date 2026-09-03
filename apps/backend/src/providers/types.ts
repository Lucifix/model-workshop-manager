/**
 * Generic provider interface. Every catalog data source — however it gets its
 * data in (manual entry, CSV import, an optional barcode lookup, or a future
 * official manufacturer API if one is ever published) — implements this same
 * small surface. Route handlers depend only on this interface, never on a
 * specific provider, so adding a new source never touches core app code.
 *
 * See docs/DATA_SOURCES.md for why no automated manufacturer/aggregator
 * source is wired up by default.
 */

export interface ModelResult {
  externalId: string;
  manufacturerName: string;
  kitNumber: string;
  name: string;
  scale?: string;
  imageUrl?: string;
  sourceUrl?: string;
}

export interface ModelDetails extends ModelResult {
  category?: string;
  difficulty?: string;
  partCount?: number;
  description?: string;
  instructionUrl?: string;
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
  searchModels(query: string): Promise<ModelResult[]>;
  getModel(externalId: string): Promise<ModelDetails | null>;
  searchPaints(query: string): Promise<PaintResult[]>;
}
