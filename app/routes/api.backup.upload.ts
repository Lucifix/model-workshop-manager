import { mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { badRequest } from "../lib/api.server";
import { InvalidBackupArchiveError, extractBackupArchive } from "../lib/backupArchive.server";
import { MAX_BACKUP_UPLOAD_BYTES } from "../lib/backupFile.server";

const BACKUP_DIR = process.env.BACKUP_DIR ?? "./backups";

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
  if (file.size > MAX_BACKUP_UPLOAD_BYTES) {
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
