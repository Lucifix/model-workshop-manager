import { normalizeScale } from "./modelFields";

// The add-model form's state, plus the one place any automatic source
// (barcode lookup, text search, and later AI box-photo recognition) writes
// into it. Keeping that a single pure function is what guarantees no source
// ever clobbers something the user typed themselves.

export interface ModelFormValues {
  manufacturer: string;
  kitNumber: string;
  name: string;
  barcode: string;
  scale: string;
  category: string;
  difficulty: string;
  partCount: string;
  tagNames: string[];
  description: string;
  imageUrl: string;
  sourceUrl: string;
  instructionUrl: string;
}

export type ModelFormField = keyof ModelFormValues;

export const EMPTY_MODEL_FORM: ModelFormValues = {
  manufacturer: "",
  kitNumber: "",
  name: "",
  barcode: "",
  scale: "",
  category: "",
  difficulty: "",
  partCount: "",
  tagNames: [],
  description: "",
  imageUrl: "",
  sourceUrl: "",
  instructionUrl: "",
};

/** Fields that live behind "More details" — if a prefill fills any of them,
 * the form opens that section so the user sees what changed. */
export const DETAIL_FIELDS: readonly ModelFormField[] = [
  "scale",
  "category",
  "difficulty",
  "partCount",
  "tagNames",
  "description",
  "imageUrl",
  "sourceUrl",
  "instructionUrl",
];

export type ModelPrefill = {
  [K in ModelFormField]?: (K extends "partCount" ? number | string : ModelFormValues[K]) | null;
};

/**
 * Applies `prefill` to every field the user hasn't typed into (`touched`).
 * Empty prefill values never blank out a field. A field filled by an earlier
 * prefill but not touched since can be overwritten by a later one — that's
 * what lets a second, better lookup replace the first. Tags are additive:
 * suggestions are merged in, never replacing what's there.
 */
export function applyPrefill(
  values: ModelFormValues,
  touched: ReadonlySet<ModelFormField>,
  prefill: ModelPrefill,
): { values: ModelFormValues; applied: ModelFormField[] } {
  const next: ModelFormValues = { ...values };
  const applied: ModelFormField[] = [];

  for (const field of Object.keys(prefill) as ModelFormField[]) {
    const raw = prefill[field];
    if (raw === undefined || raw === null) {
      continue;
    }
    if (field === "tagNames") {
      const incoming = (raw as string[]).map((t) => t.trim()).filter(Boolean);
      const known = new Set(next.tagNames.map((t) => t.toLowerCase()));
      const added = incoming.filter((t) => !known.has(t.toLowerCase()));
      if (added.length > 0) {
        next.tagNames = [...next.tagNames, ...added];
        applied.push(field);
      }
      continue;
    }
    if (touched.has(field)) {
      continue;
    }
    let value = String(raw).trim();
    if (field === "scale") {
      value = normalizeScale(value);
    }
    if (field === "partCount" && !/^\d+$/.test(value)) {
      continue;
    }
    if (value === "" || value === next[field]) {
      continue;
    }
    (next as Record<ModelFormField, unknown>)[field] = value;
    applied.push(field);
  }

  return { values: next, applied };
}

/** Maps a catalog lookup/search result onto the form. Deliberately leaves out
 * sourceUrl: for UPCitemdb that would be an affiliate redirect, not the
 * kit's official page. */
export function prefillFromCatalogResult(result: {
  manufacturerName: string;
  kitNumber: string;
  name: string;
  barcode?: string;
  scale?: string;
  category?: string;
  description?: string;
  imageUrl?: string;
}): ModelPrefill {
  return {
    manufacturer: result.manufacturerName,
    kitNumber: result.kitNumber,
    name: result.name,
    barcode: result.barcode,
    scale: result.scale,
    category: result.category,
    description: result.description,
    imageUrl: result.imageUrl,
  };
}

/**
 * Called when a new lookup/search starts: whatever the previous result filled
 * in belongs to the previous kit, so it's cleared rather than left on screen
 * (or saved) next to the new one. Fields the user typed stay.
 *
 * The barcode needs care because it reaches the form two ways:
 * - scanned/typed and *matched* by a lookup (`boundBarcode`) — it belongs to
 *   that result's kit, so it goes with it;
 * - scanned/typed with no match yet — it's still waiting for this box's kit
 *   (the user is now searching by name), so it stays.
 * A barcode that only arrived via a prefill is in `prefilled` and is cleared
 * like any other auto-filled field. A lookup image the user clicked counts
 * as touched but still belongs to the old result, so it's cleared too.
 */
export function clearAutoFilled(
  values: ModelFormValues,
  touched: ReadonlySet<ModelFormField>,
  prefilled: ReadonlySet<ModelFormField>,
  previous: { boundBarcode: string | null; lookupImages: ReadonlySet<string> },
): { values: ModelFormValues; touched: ReadonlySet<ModelFormField> } {
  const next: ModelFormValues = { ...values };
  const nextTouched = new Set(touched);
  const reset = (field: Exclude<ModelFormField, "tagNames">) => {
    next[field] = EMPTY_MODEL_FORM[field];
    nextTouched.delete(field);
  };

  for (const field of prefilled) {
    // Tags are merged, not replaced, so a prefill never owns the whole list.
    if (field !== "tagNames") {
      reset(field);
    }
  }
  if (next.barcode && next.barcode === previous.boundBarcode) {
    reset("barcode");
  }
  if (next.imageUrl && previous.lookupImages.has(next.imageUrl)) {
    reset("imageUrl");
  }
  return { values: next, touched: nextTouched };
}
