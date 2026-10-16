import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./data/uploads";

// @fastify/multipart enforced this at the transport layer automatically;
// request.formData() has no built-in equivalent, so it's checked explicitly.
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * Accepted content types, each mapped to the extension the file is stored
 * under. UPLOAD_DIR is served by express.static, so the stored extension
 * decides the Content-Type it comes back with — deriving it here rather than
 * from the client's filename is what stops an uploaded .html (or .svg, which
 * is scriptable too, and is included in the `image/*` file picker) from being
 * served back as executable same-origin content.
 */
export const IMAGE_UPLOAD_TYPES: ReadonlyMap<string, string> = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
  ["image/avif", ".avif"],
  // iOS shares camera-roll photos as HEIC unless the user has switched the
  // capture format — rejecting it would break uploads from an iPhone.
  ["image/heic", ".heic"],
  ["image/heif", ".heif"],
]);

export const PDF_UPLOAD_TYPES: ReadonlyMap<string, string> = new Map([["application/pdf", ".pdf"]]);

export class UploadTooLargeError extends Response {
  constructor() {
    super(JSON.stringify({ error: "file_too_large" }), {
      status: 413,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export class UnsupportedUploadTypeError extends Response {
  constructor(allowed: ReadonlyMap<string, string>) {
    super(JSON.stringify({ error: "unsupported_file_type", allowed: [...allowed.keys()] }), {
      status: 415,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/** Saves an uploaded File to UPLOAD_DIR/<subdir>/<timestamp>-<uuid><ext> and
 * returns { filename, relativePath, url } — relativePath is relative to
 * UPLOAD_DIR, and ext comes from `allowed`, never from the client's filename. */
export async function saveUploadedFile(
  file: File,
  allowed: ReadonlyMap<string, string>,
  ...subdirParts: string[]
): Promise<{ filename: string; relativePath: string; url: string }> {
  if (file.size > MAX_FILE_SIZE) {
    throw new UploadTooLargeError();
  }
  const ext = allowed.get(file.type);
  if (!ext) {
    throw new UnsupportedUploadTypeError(allowed);
  }
  const dir = join(UPLOAD_DIR, ...subdirParts);
  mkdirSync(dir, { recursive: true });
  // The original name is dropped rather than sanitized — it's kept in the DB
  // where a caller needs it for display (projectPhotos.originalFilename).
  const filename = `${Date.now()}-${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(join(dir, filename), buffer);
  const relativePath = join(...subdirParts, filename);
  return { filename, relativePath, url: `/uploads/${relativePath}` };
}

export class RemoteImageError extends Response {
  constructor(reason: string) {
    super(JSON.stringify({ error: "remote_image_failed", reason }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Retail CDNs are sloppy with Content-Type ("image/jpg", or a bare
// "application/octet-stream"), so the bytes decide when the header doesn't.
function sniffImageType(bytes: Uint8Array): string | undefined {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (ascii(0, 8) === "\x89PNG\r\n\x1a\n") {
    return "image/png";
  }
  if (ascii(0, 4) === "GIF8") {
    return "image/gif";
  }
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return "image/webp";
  }
  if (ascii(4, 12) === "ftypavif") {
    return "image/avif";
  }
  return undefined;
}

/** Downloads a remote image into UPLOAD_DIR, same rules as an upload: size
 * cap, image types only, extension derived server-side. Callers must vet the
 * URL first — this is only for images a catalog provider returned (see
 * CatalogProvider.ownsImageUrl), never an arbitrary user-supplied address. */
export async function saveRemoteImage(
  url: string,
  ...subdirParts: string[]
): Promise<{ filename: string; relativePath: string; url: string }> {
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new RemoteImageError("fetch_failed");
  }
  if (!res.ok) {
    throw new RemoteImageError(`http_${res.status}`);
  }
  if (Number(res.headers.get("content-length") ?? 0) > MAX_FILE_SIZE) {
    throw new UploadTooLargeError();
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  const declared = res.headers.get("content-type")?.split(";")[0]!.trim().toLowerCase();
  const type =
    declared === "image/jpg"
      ? "image/jpeg"
      : declared && IMAGE_UPLOAD_TYPES.has(declared)
        ? declared
        : sniffImageType(bytes);
  if (!type) {
    throw new UnsupportedUploadTypeError(IMAGE_UPLOAD_TYPES);
  }
  return saveUploadedFile(
    new File([bytes], "remote", { type }),
    IMAGE_UPLOAD_TYPES,
    ...subdirParts,
  );
}
