import { mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { badRequest } from "../lib/api.server";
import { InvalidBackupArchiveError, extractBackupArchive } from "../lib/backupArchive.server";

const BACKUP_DIR = process.env.BACKUP_DIR ?? "./backups";

// Backups bundle the SQLite DB plus every uploaded photo, so they run much
// larger than a single photo upload (25 MB cap in upload.server.ts) — still
// bounded so a bad or malicious upload can't fill the disk.
const MAX_BACKUP_UPLOAD_SIZE = 2 * 1024 * 1024 * 1024; // 2 GiB

const GZIP_MAGIC = Buffer.from([0x1f, 0x8b]);

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return badRequest("no_file");
  }
  if (!file.name.endsWith(".tar.gz")) {
    return badRequest("invalid_filename", { message: "Expected a .tar.gz backup file." });
  }
  if (file.size > MAX_BACKUP_UPLOAD_SIZE) {
    return badRequest("file_too_large");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!buffer.subarray(0, GZIP_MAGIC.length).equals(GZIP_MAGIC)) {
    return badRequest("invalid_archive", { message: "That doesn't look like a gzip file." });
  }

  mkdirSync(BACKUP_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  // The uploaded filename is never trusted for path construction — only its
  // .tar.gz suffix is checked above — so the stored name is server-generated.
  const filename = `uploaded-${ts}.tar.gz`;
  const destPath = join(BACKUP_DIR, filename);
  writeFileSync(destPath, buffer);

  try {
    const { stagingDir } = await extractBackupArchive(destPath);
    rmSync(stagingDir, { recursive: true, force: true });
  } catch (err) {
    rmSync(destPath, { force: true });
    if (err instanceof InvalidBackupArchiveError) {
      return badRequest("invalid_archive", { message: err.message });
    }
    throw err;
  }

  const stat = statSync(destPath);
  return Response.json(
    { filename, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() },
    { status: 201 },
  );
}
