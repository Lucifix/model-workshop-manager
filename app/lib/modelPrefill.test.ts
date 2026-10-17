import { describe, expect, it } from "vitest";
import {
  EMPTY_MODEL_FORM,
  applyPrefill,
  clearAutoFilled,
  prefillFromCatalogResult,
  type ModelFormField,
} from "./modelPrefill";

const none = new Set<ModelFormField>();

describe("applyPrefill", () => {
  it("fills empty, untouched fields and reports which ones", () => {
    const { values, applied } = applyPrefill(EMPTY_MODEL_FORM, none, {
      manufacturer: "Tamiya",
      kitNumber: "61119",
      scale: "1/48",
      partCount: 72,
    });
    expect(values).toMatchObject({
      manufacturer: "Tamiya",
      kitNumber: "61119",
      scale: "1:48",
      partCount: "72",
    });
    expect(applied).toEqual(["manufacturer", "kitNumber", "scale", "partCount"]);
  });

  it("never overwrites a field the user typed into", () => {
    const current = { ...EMPTY_MODEL_FORM, name: "My Spitfire", kitNumber: "" };
    const { values, applied } = applyPrefill(current, new Set(["name", "kitNumber"]), {
      name: "Supermarine Spitfire Mk.I",
      kitNumber: "61119",
    });
    expect(values.name).toBe("My Spitfire");
    expect(values.kitNumber).toBe("");
    expect(applied).toEqual([]);
  });

  it("lets a later prefill replace an earlier, untouched one", () => {
    const first = applyPrefill(EMPTY_MODEL_FORM, none, { name: "Spitfire" }).values;
    const second = applyPrefill(first, none, { name: "Supermarine Spitfire Mk.I" });
    expect(second.values.name).toBe("Supermarine Spitfire Mk.I");
  });

  it("ignores empty, null and undefined values instead of blanking fields", () => {
    const current = { ...EMPTY_MODEL_FORM, manufacturer: "Revell", scale: "1:200" };
    const { values, applied } = applyPrefill(current, none, {
      manufacturer: "",
      scale: null,
      category: undefined,
      kitNumber: "   ",
    });
    expect(values).toEqual(current);
    expect(applied).toEqual([]);
  });

  it("replaces a barcode that only came from an earlier prefill", () => {
    const first = applyPrefill(EMPTY_MODEL_FORM, none, { barcode: "4009803052397" }).values;
    expect(applyPrefill(first, none, { barcode: "4950344586387" }).values.barcode).toBe(
      "4950344586387",
    );
  });

  it("keeps a barcode the user scanned or typed", () => {
    const current = { ...EMPTY_MODEL_FORM, barcode: "4009803052397" };
    const { values } = applyPrefill(current, new Set(["barcode"]), { barcode: "4950344586387" });
    expect(values.barcode).toBe("4009803052397");
  });

  it("doesn't report a field whose value didn't change", () => {
    const current = { ...EMPTY_MODEL_FORM, scale: "1:48" };
    expect(applyPrefill(current, none, { scale: "1/48" }).applied).toEqual([]);
  });

  it("drops a non-numeric part count", () => {
    expect(applyPrefill(EMPTY_MODEL_FORM, none, { partCount: "lots" }).applied).toEqual([]);
  });

  it("merges tags instead of replacing them, even when touched", () => {
    const current = { ...EMPTY_MODEL_FORM, tagNames: ["WWII"] };
    const { values, applied } = applyPrefill(current, new Set(["tagNames"]), {
      tagNames: ["wwii", "RAF"],
    });
    expect(values.tagNames).toEqual(["WWII", "RAF"]);
    expect(applied).toEqual(["tagNames"]);
  });

  it("doesn't mutate its input", () => {
    const current = { ...EMPTY_MODEL_FORM };
    applyPrefill(current, none, { name: "x", tagNames: ["a"] });
    expect(current).toEqual(EMPTY_MODEL_FORM);
  });
});

describe("prefillFromCatalogResult", () => {
  it("maps a lookup result without carrying over a source URL", () => {
    const result = {
      manufacturerName: "Tamiya",
      kitNumber: "61119",
      name: "Supermarine Spitfire Mk.I",
      barcode: "4950344611195",
      scale: "1:48",
      imageUrl: "https://cdn.test/a.jpg",
      sourceUrl: "https://www.upcitemdb.com/norob/alink/?id=123",
    };
    const prefill = prefillFromCatalogResult(result);
    expect(prefill).not.toHaveProperty("sourceUrl");
    expect(applyPrefill(EMPTY_MODEL_FORM, none, prefill).values).toMatchObject({
      manufacturer: "Tamiya",
      kitNumber: "61119",
      barcode: "4950344611195",
      imageUrl: "https://cdn.test/a.jpg",
    });
  });
});

describe("clearAutoFilled", () => {
  const noPrevious = { boundBarcode: null, lookupImages: new Set<string>() };

  it("clears what the last result filled, keeping what the user typed", () => {
    const values = {
      ...EMPTY_MODEL_FORM,
      manufacturer: "Revell",
      kitNumber: "05239",
      name: "My own name",
      scale: "1:200",
      tagNames: ["Ships"],
    };
    const result = clearAutoFilled(
      values,
      new Set(["name"]),
      new Set(["manufacturer", "kitNumber", "scale", "tagNames"]),
      noPrevious,
    );
    expect(result.values).toEqual({
      ...EMPTY_MODEL_FORM,
      name: "My own name",
      tagNames: ["Ships"],
    });
    expect([...result.touched]).toEqual(["name"]);
  });

  // The phone-test bug: scan the Revell box (matched, filled), then search
  // "tamiya 58638" and pick it — the Revell barcode must not ride along.
  it("drops a typed barcode that a lookup already matched to the previous kit", () => {
    const values = { ...EMPTY_MODEL_FORM, barcode: "4009803052397", name: "Tug Boat" };
    const result = clearAutoFilled(values, new Set(["barcode"]), new Set(["name"]), {
      boundBarcode: "4009803052397",
      lookupImages: new Set(),
    });
    expect(result.values.barcode).toBe("");
    expect(result.touched.has("barcode")).toBe(false);

    // ...so the next pick's barcode applies.
    const picked = applyPrefill(result.values, result.touched, { barcode: "4950344586387" });
    expect(picked.values.barcode).toBe("4950344586387");
  });

  it("keeps a scanned barcode nothing has matched yet (scan, no match, search by name)", () => {
    const values = { ...EMPTY_MODEL_FORM, barcode: "4009803052397" };
    const result = clearAutoFilled(values, new Set(["barcode"]), new Set(), noPrevious);
    expect(result.values.barcode).toBe("4009803052397");
    expect(applyPrefill(result.values, result.touched, { barcode: "1" }).values.barcode).toBe(
      "4009803052397",
    );
  });

  it("clears a picked lookup image even though picking it counted as typing", () => {
    const values = { ...EMPTY_MODEL_FORM, imageUrl: "https://cdn.test/old.jpg" };
    const result = clearAutoFilled(values, new Set(["imageUrl"]), new Set(), {
      boundBarcode: null,
      lookupImages: new Set(["https://cdn.test/old.jpg"]),
    });
    expect(result.values.imageUrl).toBe("");
  });

  it("keeps a hand-pasted image URL", () => {
    const values = { ...EMPTY_MODEL_FORM, imageUrl: "https://maker.test/box.jpg" };
    const result = clearAutoFilled(values, new Set(["imageUrl"]), new Set(), noPrevious);
    expect(result.values.imageUrl).toBe("https://maker.test/box.jpg");
  });
});
