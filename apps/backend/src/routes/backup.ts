import type { FastifyInstance } from "fastify";
import { createReadStream } from "node:fs";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import * as tar from "tar";
import { sqlite } from "../db/client.js";

const BACKUP_DIR = process.env.BACKUP_DIR ?? "./backups";
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./data/uploads";
const DATA_DIR = process.env.DATA_DIR ?? "./data";
const DATABASE_DIR = join(DATA_DIR, "database");

const FILENAME_PATTERN = /^[\w.-]+\.tar\.gz$/;

function isValidFilename(filename: string): boolean {
  return FILENAME_PATTERN.test(filename) && !filename.includes("..");
}

function listBackups() {
  if (!existsSync(BACKUP_DIR)) return [];
  return readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".tar.gz"))
    .map((filename) => {
      const stat = statSync(join(BACKUP_DIR, filename));
      return {
        filename,
        sizeBytes: stat.size,
        createdAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * The sidecar's archives have a `workshop-data/` top-level prefix (from its
 * volume mount path); ones created here don't. Normalize to whichever
 * directory actually holds `database/`.
 */
function findPayloadRoot(stagingDir: string): string {
  if (existsSync(join(stagingDir, "database"))) return stagingDir;
  const entries = readdirSync(stagingDir, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory());
  if (dirs.length === 1 && existsSync(join(stagingDir, dirs[0]!.name, "database"))) {
    return join(stagingDir, dirs[0]!.name);
  }
  return stagingDir;
}

export async function backupRoutes(app: FastifyInstance) {
  app.get("/api/backup", async () => listBackups());

  app.post("/api/backup", async (_req, reply) => {
    mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `manual-${stamp}.tar.gz`;
    const stagingDir = mkdtempSync(join(tmpdir(), "workshop-backup-"));

    try {
      const dbSnapshotPath = join(stagingDir, "database", "workshop.db");
      mkdirSync(dirname(dbSnapshotPath), { recursive: true });
      await sqlite.backup(dbSnapshotPath);

      if (existsSync(UPLOAD_DIR)) {
        cpSync(UPLOAD_DIR, join(stagingDir, "uploads"), { recursive: true });
      } else {
        mkdirSync(join(stagingDir, "uploads"), { recursive: true });
      }

      const destPath = join(BACKUP_DIR, filename);
      await tar.create({ gzip: true, file: destPath, cwd: stagingDir }, ["database", "uploads"]);

      const stat = statSync(destPath);
      reply.code(201).send({ filename, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() });
    } finally {
      rmSync(stagingDir, { recursive: true, force: true });
    }
  });

  app.get("/api/backup/:filename/download", async (req, reply) => {
    const { filename } = req.params as { filename: string };
    if (!isValidFilename(filename)) return reply.code(400).send({ error: "invalid_filename" });

    const filePath = join(BACKUP_DIR, filename);
    if (!existsSync(filePath)) return reply.code(404).send({ error: "not_found" });

    reply.header("Content-Disposition", `attachment; filename="${filename}"`);
    reply.header("Content-Type", "application/gzip");
    return reply.send(createReadStream(filePath));
  });

  app.delete("/api/backup/:filename", async (req, reply) => {
    const { filename } = req.params as { filename: string };
    if (!isValidFilename(filename)) return reply.code(400).send({ error: "invalid_filename" });

    const filePath = join(BACKUP_DIR, filename);
    if (!existsSync(filePath)) return reply.code(404).send({ error: "not_found" });

    rmSync(filePath);
    reply.code(204).send();
  });

  app.post("/api/backup/:filename/restore", async (req, reply) => {
    const { filename } = req.params as { filename: string };
    if (!isValidFilename(filename)) return reply.code(400).send({ error: "invalid_filename" });

    const filePath = join(BACKUP_DIR, filename);
    if (!existsSync(filePath)) return reply.code(404).send({ error: "not_found" });

    const stagingDir = mkdtempSync(join(tmpdir(), "workshop-restore-"));
    try {
      await tar.extract({ file: filePath, cwd: stagingDir });

      const payloadRoot = findPayloadRoot(stagingDir);
      const stagedDb = join(payloadRoot, "database", "workshop.db");
      if (!existsSync(stagedDb)) {
        rmSync(stagingDir, { recursive: true, force: true });
        return reply.code(400).send({
          error: "invalid_archive",
          message: "This file doesn't look like a workshop backup — no database found inside.",
        });
      }

      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      sqlite.close();

      if (existsSync(DATABASE_DIR)) renameSync(DATABASE_DIR, `${DATABASE_DIR}.pre-restore-${ts}`);
      if (existsSync(UPLOAD_DIR)) renameSync(UPLOAD_DIR, `${UPLOAD_DIR}.pre-restore-${ts}`);

      renameSync(join(payloadRoot, "database"), DATABASE_DIR);
      const stagedUploads = join(payloadRoot, "uploads");
      if (existsSync(stagedUploads)) {
        renameSync(stagedUploads, UPLOAD_DIR);
      } else {
        mkdirSync(UPLOAD_DIR, { recursive: true });
      }

      rmSync(stagingDir, { recursive: true, force: true });

      reply.code(200).send({ restarting: true });
      setTimeout(() => process.exit(0), 250);
    } catch (err) {
      rmSync(stagingDir, { recursive: true, force: true });
      throw err;
    }
  });
}
