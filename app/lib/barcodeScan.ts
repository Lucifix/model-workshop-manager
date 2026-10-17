import zxingWasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";
import { isBarcode } from "./modelFields";

// Decodes a box barcode from a still photo, entirely in the browser. A still
// image rather than a live camera stream on purpose: getUserMedia needs a
// secure context, and this app is usually served over plain HTTP on a LAN,
// whereas <input type="file" capture> works everywhere.

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
}

const RETAIL_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];
// Phone photos are 12+ MP; decoding at that size is slow in wasm and no more
// accurate for a barcode that fills a decent part of the frame.
const MAX_DECODE_EDGE = 2000;

async function detectNative(bitmap: ImageBitmap): Promise<string[] | null> {
  const Detector = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  if (!Detector) {
    return null;
  }
  try {
    const supported = (await Detector.getSupportedFormats?.()) ?? RETAIL_FORMATS;
    const formats = RETAIL_FORMATS.filter((f) => supported.includes(f));
    if (formats.length === 0) {
      return null;
    }
    const found = await new Detector({ formats }).detect(bitmap);
    return found.map((b) => b.rawValue);
  } catch {
    return null; // fall through to the wasm decoder
  }
}

function toImageData(bitmap: ImageBitmap, maxEdge: number): ImageData {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

let zxingReady: Promise<typeof import("zxing-wasm/reader")> | null = null;

function loadZxing() {
  // Loaded lazily (~1 MB of wasm) and served from our own origin rather than
  // the library's default CDN, so scanning also works on an offline LAN.
  zxingReady ??= import("zxing-wasm/reader").then((mod) => {
    mod.prepareZXingModule({
      overrides: {
        locateFile: (path: string, prefix: string) =>
          path.endsWith(".wasm") ? zxingWasmUrl : prefix + path,
      },
    });
    return mod;
  });
  return zxingReady;
}

async function detectZxing(bitmap: ImageBitmap): Promise<string[]> {
  const { readBarcodes } = await loadZxing();
  const fullEdge = Math.max(bitmap.width, bitmap.height);
  // Downscaled first for speed; full resolution only if that found nothing
  // (a small barcode in a whole-box shot can need every pixel).
  const edges = fullEdge > MAX_DECODE_EDGE ? [MAX_DECODE_EDGE, fullEdge] : [fullEdge];
  for (const edge of edges) {
    // oxlint-disable-next-line no-await-in-loop -- the second pass only runs if the first fails
    const results = await readBarcodes(toImageData(bitmap, edge), {
      formats: ["EAN13", "EAN8", "UPCA", "UPCE"],
      tryHarder: true,
      maxNumberOfSymbols: 4,
    });
    const valid = results.filter((r) => r.isValid).map((r) => r.text);
    if (valid.length > 0) {
      return valid;
    }
  }
  return [];
}

/** Returns the first EAN/UPC found in the photo, or null if none could be read. */
export async function decodeBarcodeFromImage(file: Blob): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  try {
    const native = await detectNative(bitmap);
    const candidates = native && native.length > 0 ? native : await detectZxing(bitmap);
    return candidates.map((c) => c.trim()).find(isBarcode) ?? null;
  } finally {
    bitmap.close();
  }
}
