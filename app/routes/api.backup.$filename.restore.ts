import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { sqlite } from "../db/client.server";
import { UPLOAD_DIR } from "../lib/upload.server";
import { badRequest, notFound, methodNotAllowed } from "../lib/api.server";
import { isValidFilename } from "../lib/backupFile.server";
import { InvalidBackupArchiveError, extractBackupArchive } from "../lib/backupArchive.server";

const BACKUP_DIR = process.env.BACKUP_DIR ?? "./backups";
const DATA_DIR = process.env.DATA_DIR ?? "./data";
const DATABASE_DIR = join(DATA_DIR, "database");

// Restarts the whole process after a restore — in this merged deployment that
// briefly drops the UI too, not just the API (the old standalone Fastify
// container's restart left nginx serving the frontend throughout). Acceptable
// for a single-user LAN app; see the migration plan doc. The client shows a
// "app restarting" message rather than a background-only notice.
export async function action({
  request,
  params,
}: {
  request: Request;
  params: { filename: string };
}) {
  if (request.method !== "POST") {
    return methodNotAllowed();
  }

  const { filename } = params;
  if (!isValidFilename(filename)) {
    return badRequest("invalid_filename");
  }

  const filePath = join(BACKUP_DIR, filename);
  if (!existsSync(filePath)) {
    return notFound();
  }

  let extracted: { stagingDir: string; payloadRoot: string };
  try {
    extracted = await extractBackupArchive(filePath);
  } catch (err) {
    if (err instanceof InvalidBackupArchiveError) {
      return badRequest("invalid_archive", { message: err.message });
    }
    throw err;
  }

  const { stagingDir, payloadRoot } = extracted;
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    sqlite.close();

    if (existsSync(DATABASE_DIR)) {
      renameSync(DATABASE_DIR, `${DATABASE_DIR}.pre-restore-${ts}`);
    }
    if (existsSync(UPLOAD_DIR)) {
      renameSync(UPLOAD_DIR, `${UPLOAD_DIR}.pre-restore-${ts}`);
    }

    renameSync(join(payloadRoot, "database"), DATABASE_DIR);
    const stagedUploads = join(payloadRoot, "uploads");
    if (existsSync(stagedUploads)) {
      renameSync(stagedUploads, UPLOAD_DIR);
    } else {
      mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    rmSync(stagingDir, { recursive: true, force: true });

    setTimeout(() => process.exit(0), 250);
    return Response.json({ restarting: true });
  } catch (err) {
    rmSync(stagingDir, { recursive: true, force: true });
    throw err;
  }
}
