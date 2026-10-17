import { extractScale } from "../lib/modelFields.js";

// Pure parsing for UPCitemdb responses — no db/fetch imports, so it's cheap to
// unit-test against recorded fixtures. UPCitemdb is generic retail data: the
// hobby-relevant facts (kit number, scale, a clean kit name) are buried in
// reseller-written titles, so most of this is heuristics over those strings.

export interface UpcItemOffer {
  merchant?: string;
  title?: string;
  currency?: string;
  price?: number | string;
  // `link` deliberately isn't modelled: it's a UPCitemdb affiliate redirect,
  // not the product page, so it must never end up as a model's sourceUrl.
}

export interface UpcItem {
  ean?: string;
  upc?: string;
  title?: string;
  description?: string;
  brand?: string;
  model?: string;
  // `category` exists too, but it's generic retail taxonomy ("Toys & Games >
  // Toys > Play Vehicles") that says nothing useful about the kit — ignored.
  images?: string[];
  lowest_recorded_price?: number;
  highest_recorded_price?: number;
  offers?: UpcItemOffer[];
}

export interface ParsedKit {
  barcode: string;
  manufacturerName?: string;
  kitNumber?: string;
  name: string;
  scale?: string;
  category?: string;
  description?: string;
  images: string[];
  priceRange?: { low: number; high: number };
}

export interface KitGroup extends ParsedKit {
  barcodes: string[];
  listingCount: number;
}

const CORPORATE_SUFFIX = String.raw`(?:\s+(?:America|USA|Europe|Japan))?(?:,?\s*(?:Inc|Ltd|LLC|Co|Corp|GmbH)\b\.?)?`;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function brandKey(brand: string | undefined): string {
  return (brand ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function cleanBrand(brand: string | undefined): string | undefined {
  if (!brand) {
    return undefined;
  }
  const cleaned = brand
    .replace(new RegExp(`${CORPORATE_SUFFIX}\\s*$`, "i"), "")
    .replace(/[\s,]+$/, "")
    .trim();
  return cleaned || undefined;
}

// A short letter prefix glued to the number ("TAM61119", "A05100") is a
// reseller/brand code — only strip it when it plausibly abbreviates the
// brand, so genuinely alphanumeric kit numbers survive intact.
function stripBrandPrefix(code: string, brand: string | undefined): string | undefined {
  const match = /^([A-Za-z]{1,5})[\s-]?(\d{3,7}[A-Za-z]?)$/.exec(code);
  if (match && brandKey(brand).startsWith(match[1]!.toLowerCase())) {
    return match[2];
  }
  return undefined;
}

function looksLikeBarcode(value: string, barcode: string): boolean {
  const digits = value.replace(/^0+/, "");
  return digits === barcode.replace(/^0+/, "") || /^\d{12,14}$/.test(value);
}

// `model` is free text per listing and sometimes holds a marketplace ID
// instead of the kit number (seen live: "ADIB01LXLUUAO" for Tamiya 58638).
// Only trust it when it's shaped like a kit number or the titles back it up.
function plausibleKitNumber(value: string, titles: string[]): boolean {
  if (/^\d[\d-]*[A-Za-z]?$/.test(value) || /^[A-Za-z]{1,5}[\s-]?\d{3,}[A-Za-z]?$/.test(value)) {
    return true;
  }
  const token = new RegExp(`(?<![\\w])${escapeRegExp(value)}(?![\\w])`, "i");
  return titles.some((t) => token.test(t));
}

function kitNumberFromModelField(
  model: string | undefined,
  brand: string | undefined,
  barcode: string,
  titles: string[],
): string | undefined {
  const trimmed = model?.trim();
  if (!trimmed || looksLikeBarcode(trimmed, barcode) || !plausibleKitNumber(trimmed, titles)) {
    return undefined;
  }
  return stripBrandPrefix(trimmed, brand) ?? trimmed;
}

function kitNumberCandidates(
  text: string,
  brand: string | undefined,
  barcode: string,
): Map<string, number> {
  const scores = new Map<string, number>();
  const add = (value: string, score: number) => {
    if (!looksLikeBarcode(value, barcode)) {
      scores.set(value, Math.max(scores.get(value) ?? 0, score));
    }
  };
  // Scale ratios are removed first so "1/200" can't donate a "200".
  const withoutScale = text.replace(/1\s*[:/]\s*\d{1,4}/g, " ");
  const tokens = withoutScale.split(/[\s,;()[\]|]+/).filter(Boolean);
  const brandFirstWord = brandKey(brand?.split(/\s+/)[0]);
  tokens.forEach((raw, i) => {
    const token = raw.replace(/^[#–:.-]+|[–:.-]+$/g, "");
    const prefixed = stripBrandPrefix(token, brand);
    if (prefixed) {
      add(prefixed, 3);
      return;
    }
    if (!/^\d{4,6}$/.test(token)) {
      return;
    }
    const afterBrand = i > 0 && brandFirstWord !== "" && brandKey(tokens[i - 1]) === brandFirstWord;
    // Four-digit years ("1943 Spitfire") are the most common false positive.
    const yearLike = /^(?:19|20)\d\d$/.test(token);
    let score = token.length >= 5 ? 1 : yearLike ? 0.1 : 0.5;
    if (afterBrand) {
      score += 1;
    }
    add(token, score);
  });
  return scores;
}

export function extractKitNumber(item: UpcItem): string | undefined {
  const barcode = item.ean ?? item.upc ?? "";
  const fromModel = kitNumberFromModelField(item.model, item.brand, barcode, allTitles(item));
  if (fromModel) {
    return fromModel;
  }
  // Votes across the main title and every offer title, so one reseller's
  // odd numbering can't outvote the others.
  const totals = new Map<string, number>();
  for (const title of allTitles(item)) {
    for (const [value, score] of kitNumberCandidates(title, item.brand, barcode)) {
      totals.set(value, (totals.get(value) ?? 0) + score);
    }
  }
  let best: string | undefined;
  let bestScore = 0;
  for (const [value, score] of totals) {
    if (score > bestScore) {
      best = value;
      bestScore = score;
    }
  }
  return best;
}

function allTitles(item: UpcItem): string[] {
  return [item.title, ...(item.offers ?? []).map((o) => o.title)].filter(
    (t): t is string => typeof t === "string" && t.trim() !== "",
  );
}

const FILLER_PATTERNS = [
  /\b(?:(?:plastic|scale|ship|aircraft|airplane|plane|tank|car|military|hobby)\s+)*model\s+(?:making\s+|building\s+)?kits?\b/gi,
  /\bmodel\s+making\b/gi,
  /\bplastic\b/gi,
  // Retail colour attribute that leaks into titles ("… Carrier Multi-Colored").
  /\bmulti-?colou?red\b/gi,
  /\bscale\s+model\b/gi,
  /\bkit\s*$/gi,
];

export function cleanName(
  title: string,
  opts: { brand?: string; kitNumber?: string; model?: string },
): string {
  let name = ` ${title} `;
  const brand = cleanBrand(opts.brand);
  if (brand) {
    name = name.replace(new RegExp(`\\b${escapeRegExp(brand)}${CORPORATE_SUFFIX}`, "gi"), " ");
  }
  for (const code of [opts.model, opts.kitNumber]) {
    if (code?.trim()) {
      name = name.replace(
        new RegExp(`(?<![\\w])[#]?${escapeRegExp(code.trim())}(?![\\w])`, "gi"),
        " ",
      );
    }
  }
  name = name.replace(/(?<![\d.])1\s*[:/]\s*\d{1,4}(?:\s*scale\b)?/gi, " ");
  for (const pattern of FILLER_PATTERNS) {
    name = name.replace(pattern, " ");
  }
  return name
    .replace(/\(\s*\)|\[\s*\]/g, " ")
    .replace(/\s+([,;:])/g, "$1")
    .replace(/([,;:\-–—|/])(?:\s*[,;:\-–—|/])+/g, "$1")
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:\-–—|/]+|[\s,;:\-–—|/]+$/g, "")
    .trim();
}

// Order matters: the first matching category wins, so the more specific
// buckets (Mecha before Sci-Fi, Armor before Figure for "tank with crew
// figures") come first.
const CATEGORY_KEYWORDS: [string, RegExp][] = [
  ["Mecha", /\b(?:gundam|gunpla|mobile suit|mecha|zaku|zoids|evangelion)\b/i],
  [
    "Sci-Fi",
    /\b(?:star wars|star trek|x-wing|tie fighter|millennium falcon|spaceship|starship|sci-?fi)\b/i,
  ],
  ["Diorama", /\bdiorama\b/i],
  [
    "Ship",
    /\b(?:ship|boat|tug|battleship|destroyer|cruiser|frigate|corvette|submarine|u-?boat|yacht|aircraft carrier|schooner|steamer|liner)\b/i,
  ],
  [
    "Armor",
    /\b(?:tank|panzer|armou?r|armored|armoured|half-?track|howitzer|apc|ifv|personnel carrier|tank destroyer|self-propelled)\b/i,
  ],
  [
    "Aircraft",
    /\b(?:aircraft|airplane|aeroplane|plane|fighter|bomber|helicopter|jet|supermarine|spitfire|messerschmitt|focke-?wulf|grumman|lockheed|heinkel|junkers|hawker|sukhoi|mikoyan)\b/i,
  ],
  [
    "Car",
    /\b(?:car|coupe|sedan|roadster|racing|race car|porsche|ferrari|lamborghini|formula 1|f1)\b/i,
  ],
  ["Figure", /\b(?:figures?|soldiers?|infantry|bust)\b/i],
];

export function guessCategory(texts: string[]): string | undefined {
  const haystack = texts.join(" \n ");
  return CATEGORY_KEYWORDS.find(([, pattern]) => pattern.test(haystack))?.[0];
}

export function parseUpcItem(item: UpcItem): ParsedKit {
  const barcode = item.ean ?? item.upc ?? "";
  const titles = allTitles(item);
  const kitNumber = extractKitNumber(item);
  const opts = { brand: item.brand, kitNumber, model: item.model };

  let name = item.title ? cleanName(item.title, opts) : "";
  // The main title can reduce to nothing ("Tamiya 61119"); the per-shop
  // offer titles are usually more descriptive, so fall back to those.
  if (name.length < 3) {
    name = titles.map((t) => cleanName(t, opts)).find((n) => n.length >= 3) ?? item.title ?? "";
  }

  const scale = titles.map(extractScale).find(Boolean);
  const images = [...new Set((item.images ?? []).filter((url) => /^https?:\/\//i.test(url)))];
  const low = item.lowest_recorded_price;
  const high = item.highest_recorded_price;
  const priceRange =
    typeof low === "number" && typeof high === "number" && low > 0 && high > 0
      ? { low, high }
      : undefined;

  // UPCitemdb often fills `description` with the title verbatim — that's
  // noise in a description field, not information.
  const description = item.description?.trim();
  const titleKeys = new Set(titles.map(normaliseName));

  return {
    barcode,
    manufacturerName: cleanBrand(item.brand),
    kitNumber,
    name,
    scale,
    category: guessCategory(titles),
    description:
      description && !titleKeys.has(normaliseName(description)) ? description : undefined,
    images,
    priceRange,
  };
}

function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Text search returns the same physical kit many times over under different
 * reseller UPCs ("tamiya 61119" -> 12 listings) — collapse them into one row
 * per brand + kit number, keeping every barcode and image. */
export function groupKits(kits: ParsedKit[]): KitGroup[] {
  const groups = new Map<string, KitGroup>();
  for (const kit of kits) {
    const key = `${brandKey(kit.manufacturerName)}|${
      kit.kitNumber ? `#${kit.kitNumber.toLowerCase().replace(/^0+/, "")}` : normaliseName(kit.name)
    }`;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        ...kit,
        images: [...kit.images],
        barcodes: kit.barcode ? [kit.barcode] : [],
        listingCount: 1,
      });
      continue;
    }
    existing.listingCount += 1;
    if (kit.barcode && !existing.barcodes.includes(kit.barcode)) {
      existing.barcodes.push(kit.barcode);
    }
    for (const image of kit.images) {
      if (!existing.images.includes(image)) {
        existing.images.push(image);
      }
    }
    existing.manufacturerName ??= kit.manufacturerName;
    existing.scale ??= kit.scale;
    existing.category ??= kit.category;
    existing.description ??= kit.description;
    if (!existing.name && kit.name) {
      existing.name = kit.name;
    }
    if (kit.priceRange) {
      existing.priceRange = existing.priceRange
        ? {
            low: Math.min(existing.priceRange.low, kit.priceRange.low),
            high: Math.max(existing.priceRange.high, kit.priceRange.high),
          }
        : kit.priceRange;
    }
  }
  return [...groups.values()];
}
