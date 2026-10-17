// Shared (client + server) helpers for the free-text model fields. Lives
// outside *.server.ts on purpose: the add-model form and the UPCitemdb
// parser both need the exact same normalisation, or a looked-up "1/48"
// and a typed "1:48" would end up as two different scales in the filters.

export const SCALE_PRESETS = ["1:35", "1:48", "1:72", "1:144", "1:200", "1:350", "1:700"];
export const CATEGORY_PRESETS = [
  "Aircraft",
  "Armor",
  "Ship",
  "Car",
  "Figure",
  "Sci-Fi",
  "Mecha",
  "Diorama",
];
export const DIFFICULTY_PRESETS = ["Beginner", "Intermediate", "Advanced"];

/** "1/48", "1 48", "1-48", "1:48" -> "1:48". Anything that isn't recognisably
 * a ratio is returned trimmed but otherwise untouched — non-ratio scales like
 * "28mm" or "HG" are legitimate for figures and Gunpla. */
export function normalizeScale(input: string): string {
  const trimmed = input.trim();
  const match = /^1\s*(?:[:/\-–]|\s)\s*(\d{1,4})$/.exec(trimmed);
  return match ? `1:${Number(match[1])}` : trimmed;
}

/** Finds a "1:48" / "1/48" ratio anywhere inside free text (e.g. a retail
 * title). Unlike normalizeScale, a bare "1 48" doesn't count here — inside a
 * sentence that's far more likely to be two unrelated numbers. */
export function extractScale(text: string): string | undefined {
  const match = /(?:^|[^\d.])1\s*[:/]\s*(\d{1,4})(?!\d)/.exec(text);
  return match ? `1:${Number(match[1])}` : undefined;
}

/** EAN-8, UPC-A (12), EAN-13 and GTIN-14 — the lengths UPCitemdb accepts. */
export function isBarcode(value: string): boolean {
  return /^(?:\d{8}|\d{12,14})$/.test(value.trim());
}

/** Case-insensitive de-duplication that keeps the first spelling seen, so a
 * catalog value ("Armor") wins over a preset with different casing. */
export function mergeOptions(...lists: (readonly (string | null | undefined)[])[]): string[] {
  const seen = new Map<string, string>();
  for (const list of lists) {
    for (const raw of list) {
      const value = raw?.trim();
      if (value && !seen.has(value.toLowerCase())) {
        seen.set(value.toLowerCase(), value);
      }
    }
  }
  return [...seen.values()];
}
