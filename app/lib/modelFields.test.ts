import { describe, expect, it } from "vitest";
import { extractScale, isBarcode, mergeOptions, normalizeScale } from "./modelFields";

describe("normalizeScale", () => {
  it.each([
    ["1:48", "1:48"],
    ["1/48", "1:48"],
    ["1 48", "1:48"],
    [" 1-35 ", "1:35"],
    ["1 : 700", "1:700"],
    ["1/072", "1:72"],
    ["28mm", "28mm"],
    ["HG", "HG"],
    ["", ""],
  ])("%j -> %j", (input, expected) => {
    expect(normalizeScale(input)).toBe(expected);
  });
});

describe("extractScale", () => {
  it("finds ratios inside free text", () => {
    expect(extractScale("Tamiya America, Inc 1/48 Supermarine Spitfire")).toBe("1:48");
    expect(extractScale("Tug Boat Smit Houston 1:200 Ship")).toBe("1:200");
  });

  it("doesn't treat unrelated number pairs as a scale", () => {
    expect(extractScale("Revell 05239 Tug Boat")).toBeUndefined();
    expect(extractScale("Pack of 1 48 pieces")).toBeUndefined();
    expect(extractScale("Version 2.1/3")).toBeUndefined();
  });
});

describe("isBarcode", () => {
  it("accepts EAN-8, UPC-A, EAN-13 and GTIN-14 only", () => {
    expect(isBarcode("12345670")).toBe(true);
    expect(isBarcode("098979611194")).toBe(true);
    expect(isBarcode("4950344611195")).toBe(true);
    expect(isBarcode("61119")).toBe(false);
    expect(isBarcode("tamiya 61119")).toBe(false);
    expect(isBarcode("123456789")).toBe(false);
  });
});

describe("mergeOptions", () => {
  it("de-duplicates case-insensitively, keeping the first spelling", () => {
    expect(mergeOptions(["armor", "Ship", null], ["Armor", "Aircraft", " "])).toEqual([
      "armor",
      "Ship",
      "Aircraft",
    ]);
  });
});
