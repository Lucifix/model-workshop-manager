import { existsSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as tar from "tar";
import { sqlite } from "../db/client.server";
import { UPLOAD_DIR } from "../lib/upload.server";
import { badRequest, notFound } from "../lib/api.server";
import { isValidFilename } from "../lib/backupFile.server";

const BACKUP_DIR = process.env.BACKUP_DIR ?? "./backups";
const DATA_DIR = process.env.DATA_DIR ?? "./data";
const DATABASE_DIR = join(DATA_DIR, "database");

/**
 * The sidecar's archives have a `workshop-data/` top-level prefix (from its
 * volume mount path); ones created here don't. Normalize to whichever
 * directory actually holds `database/`.
 */
function findPayloadRoot(stagingDir: string): string {
  if (existsSync(join(stagingDir, "database"))) {
    return stagingDir;
  }
  const entries = readdirSync(stagingDir, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory());
  if (dirs.length === 1 && existsSync(join(stagingDir, dirs[0]!.name, "database"))) {
    return join(stagingDir, dirs[0]!.name);
  }
  return stagingDir;
}

// Restarts the whole process after a restore — in this merged deployment that
// briefly drops the UI too, not just the API (the old standalone Fastify
// container's restart left nginx serving the frontend throughout). Acceptable
// for a single-user LAN app; see the migration plan doc. The client shows a
// "app restarting" message rather than a background-only notice.
export async function action({ params }: { params: { filename: string } }) {
  const { filename } = params;
  if (!isValidFilename(filename)) {
    return badRequest("invalid_filename");
  }

  const filePath = join(BACKUP_DIR, filename);
  if (!existsSync(filePath)) {
    return notFound();
  }

  const stagingDir = mkdtempSync(join(tmpdir(), "workshop-restore-"));
  try {
    await tar.extract({ file: filePath, cwd: stagingDir });

    const payloadRoot = findPayloadRoot(stagingDir);
    const stagedDb = join(payloadRoot, "database", "workshop.db");
    if (!existsSync(stagedDb)) {
      rmSync(stagingDir, { recursive: true, force: true });
      return badRequest("invalid_archive", {
        message: "This file doesn't look like a workshop backup — no database found inside.",
      });
    }

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
