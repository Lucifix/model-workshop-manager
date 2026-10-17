import { describe, expect, it } from "vitest";
import {
  EMPTY_MODEL_FORM,
  applyPrefill,
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
