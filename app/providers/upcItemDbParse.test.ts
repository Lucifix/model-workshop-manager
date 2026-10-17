import { describe, expect, it } from "vitest";
import {
  cleanBrand,
  cleanName,
  extractKitNumber,
  groupKits,
  guessCategory,
  parseUpcItem,
  type UpcItem,
} from "./upcItemDbParse";
import {
  revellTugLookup,
  tamiyaRcCarLookup,
  tamiyaSearch,
  tamiyaSpitfireLookup,
} from "./__fixtures__/upcItemDb";

const tamiya = tamiyaSpitfireLookup.items[0] as UpcItem;
const revell = revellTugLookup.items[0] as UpcItem;

describe("parseUpcItem", () => {
  it("pulls kit number, scale, category, clean name, images and prices from a Tamiya listing", () => {
    expect(parseUpcItem(tamiya)).toEqual({
      barcode: "4950344611195",
      manufacturerName: "Tamiya",
      kitNumber: "61119",
      name: "Supermarine Spitfire Mk.I",
      scale: "1:48",
      category: "Aircraft",
      // The listing's description is just the title repeated — dropped.
      description: undefined,
      images: tamiya.images,
      priceRange: { low: 9.99, high: 107.56 },
    });
  });

  it("falls back to the title for the kit number when `model` is empty (Revell)", () => {
    expect(parseUpcItem(revell)).toEqual({
      barcode: "4009803052397",
      manufacturerName: "Revell",
      kitNumber: "05239",
      name: "Tug Boat Smit Houston",
      scale: "1:200",
      category: "Ship",
      description: undefined,
      images: [],
      priceRange: undefined,
    });
  });

  it("never uses the barcode itself as the kit number", () => {
    const item: UpcItem = {
      ean: "4009803052397",
      title: "Revell 4009803052397 Some Kit",
      brand: "Revell",
      model: "4009803052397",
    };
    expect(parseUpcItem(item).kitNumber).toBeUndefined();
  });

  it("falls back to an offer title when the main title cleans down to nothing", () => {
    const item: UpcItem = {
      ean: "4950344611195",
      title: "Tamiya TAM61119",
      brand: "Tamiya",
      model: "TAM61119",
      offers: [{ title: "Tamiya 61119 - 1:48 British Supermarine Spitfire Mk.I" }],
    };
    const parsed = parseUpcItem(item);
    expect(parsed.name).toBe("British Supermarine Spitfire Mk.I");
    expect(parsed.scale).toBe("1:48");
  });

  it("keeps a real description", () => {
    expect(parseUpcItem({ ...tamiya, description: "Includes pilot figure." }).description).toBe(
      "Includes pilot figure.",
    );
  });

  it("drops non-http image URLs", () => {
    const parsed = parseUpcItem({ ...tamiya, images: ["javascript:alert(1)", "//x.jpg"] });
    expect(parsed.images).toEqual([]);
  });
});

describe("extractKitNumber", () => {
  it("ignores a `model` value that is a marketplace ID, not a kit number", () => {
    const parsed = parseUpcItem(tamiyaRcCarLookup.items[0] as UpcItem);
    expect(parsed.kitNumber).toBe("58638");
    expect(parsed.scale).toBe("1:10");
  });

  it("trusts an odd-looking `model` value when a title backs it up", () => {
    expect(extractKitNumber({ brand: "X", model: "MK1-ALPHA", title: "X MK1-ALPHA Kit" })).toBe(
      "MK1-ALPHA",
    );
  });

  it("only strips a letter prefix that abbreviates the brand", () => {
    expect(extractKitNumber({ brand: "Airfix", model: "A05100" })).toBe("05100");
    expect(extractKitNumber({ brand: "Revell", model: "TAM61119" })).toBe("TAM61119");
  });

  it("prefers a number right after the brand over a stray year", () => {
    expect(
      extractKitNumber({ brand: "Italeri", title: "Italeri 2779 Spitfire Mk.IX 1944 1:48" }),
    ).toBe("2779");
  });

  it("ignores the scale denominator", () => {
    expect(extractKitNumber({ brand: "Revell", title: "Revell 1/1200 something" })).toBeUndefined();
  });
});

describe("cleanName", () => {
  it("strips brand incl. corporate suffix, kit number, scale and filler", () => {
    expect(
      cleanName("Tamiya America, Inc 1/48 Supermarine Spitfire Mk.I, TAM61119", {
        brand: "Tamiya",
        kitNumber: "61119",
        model: "TAM61119",
      }),
    ).toBe("Supermarine Spitfire Mk.I");
    expect(
      cleanName("Revell 1:72 Plastic Model Making Kit Eurofighter Typhoon", { brand: "Revell" }),
    ).toBe("Eurofighter Typhoon");
    expect(
      cleanName("35263 1/35 Humvee M1025 Armament Carrier Multi-Colored", {
        brand: "Tamiya",
        kitNumber: "35263",
      }),
    ).toBe("Humvee M1025 Armament Carrier");
  });
});

describe("cleanBrand", () => {
  it("removes corporate suffixes", () => {
    expect(cleanBrand("Tamiya America, Inc")).toBe("Tamiya");
    expect(cleanBrand("Revell GmbH")).toBe("Revell");
    expect(cleanBrand("")).toBeUndefined();
  });
});

describe("guessCategory", () => {
  it.each([
    ["Tug Boat Smit Houston", "Ship"],
    ["Tiger I Tank late production", "Armor"],
    ["Supermarine Spitfire Mk.I", "Aircraft"],
    ["RG Gundam RX-78-2", "Mecha"],
    ["Porsche 911 GT3", "Car"],
    ["German infantry set", "Figure"],
    ["Something else entirely", undefined],
  ])("%s -> %s", (title, expected) => {
    expect(guessCategory([title])).toBe(expected);
  });

  it("ranks Armor above Figure for tank-with-crew kits", () => {
    expect(guessCategory(["Panzer IV with crew figures"])).toBe("Armor");
  });
});

describe("groupKits", () => {
  it("collapses reseller duplicates into one row per brand + kit number", () => {
    const groups = groupKits(tamiyaSearch.items.map((i) => parseUpcItem(i as UpcItem)));
    expect(groups).toHaveLength(2);

    const [spitfireI, spitfireV] = groups;
    expect(spitfireI).toMatchObject({
      manufacturerName: "Tamiya",
      kitNumber: "61119",
      name: "Supermarine Spitfire Mk.I",
      listingCount: 3,
      barcodes: ["4950344611195", "0098979611194", "0670133611192"],
      priceRange: { low: 9.99, high: 140 },
    });
    expect(spitfireI!.images).toEqual([
      ...tamiya.images!,
      "https://i5.walmartimages.com/asr/other-spitfire.jpeg",
    ]);
    expect(spitfireV).toMatchObject({ kitNumber: "61033", listingCount: 1 });
  });

  it("groups by name when no kit number could be found", () => {
    const groups = groupKits([
      { barcode: "1", manufacturerName: "Revell", name: "Tug Boat", images: [] },
      { barcode: "2", manufacturerName: "revell", name: "tug  boat", images: [] },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.barcodes).toEqual(["1", "2"]);
  });
});
