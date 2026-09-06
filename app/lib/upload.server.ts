import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./data/uploads";

// @fastify/multipart enforced this at the transport layer automatically;
// request.formData() has no built-in equivalent, so it's checked explicitly.
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export class UploadTooLargeError extends Response {
  constructor() {
    super(JSON.stringify({ error: "file_too_large" }), {
      status: 413,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/** Saves an uploaded File to UPLOAD_DIR/<subdir>/<timestamp>-<originalName> and
 * returns { filename, relativePath, url } — relativePath is relative to UPLOAD_DIR. */
export async function saveUploadedFile(
  file: File,
  ...subdirParts: string[]
): Promise<{ filename: string; relativePath: string; url: string }> {
  if (file.size > MAX_FILE_SIZE) {
    throw new UploadTooLargeError();
  }
  const dir = join(UPLOAD_DIR, ...subdirParts);
  mkdirSync(dir, { recursive: true });
  const filename = `${Date.now()}-${basename(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(join(dir, filename), buffer);
  const relativePath = join(...subdirParts, filename);
  return { filename, relativePath, url: `/uploads/${relativePath}` };
}
