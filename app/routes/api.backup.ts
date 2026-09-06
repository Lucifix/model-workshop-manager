import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import * as tar from "tar";
import { sqlite } from "../db/client.server";
import { UPLOAD_DIR } from "../lib/upload.server";

const BACKUP_DIR = process.env.BACKUP_DIR ?? "./backups";

function listBackups() {
  if (!existsSync(BACKUP_DIR)) {
    return [];
  }
  return readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".tar.gz"))
    .map((filename) => {
      const stat = statSync(join(BACKUP_DIR, filename));
      return { filename, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function loader() {
  return Response.json(listBackups());
}

export async function action() {
  mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `manual-${stamp}.tar.gz`;
  const stagingDir = mkdtempSync(join(tmpdir(), "workshop-backup-"));

  try {
    const dbSnapshotPath = join(stagingDir, "database", "workshop.db");
    mkdirSync(dirname(dbSnapshotPath), { recursive: true });
    await sqlite.backup(dbSnapshotPath);

    const { cpSync } = await import("node:fs");
    if (existsSync(UPLOAD_DIR)) {
      cpSync(UPLOAD_DIR, join(stagingDir, "uploads"), { recursive: true });
    } else {
      mkdirSync(join(stagingDir, "uploads"), { recursive: true });
    }

    const destPath = join(BACKUP_DIR, filename);
    await tar.create({ gzip: true, file: destPath, cwd: stagingDir }, ["database", "uploads"]);

    const stat = statSync(destPath);
    return Response.json(
      { filename, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() },
      { status: 201 },
    );
  } finally {
    rmSync(stagingDir, { recursive: true, force: true });
  }
}
