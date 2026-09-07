import {
  closeSync,
  existsSync,
  mkdtempSync,
  openSync,
  readSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as tar from "tar";

const SQLITE_MAGIC = Buffer.from("SQLite format 3\0", "utf8");

// Entries may sit at the root ("database/…") or one directory deep, since
// the nightly sidecar's archives carry a "workshop-data/" prefix from its
// volume mount path (see findPayloadRoot). Anything else is dropped.
const ALLOWED_ENTRY = /^(?:[^/]+\/)?(database|uploads)(\/|$)/;

export class InvalidBackupArchiveError extends Error {}

/**
 * Extracts a backup tarball into a fresh temp dir, treating its contents as
 * untrusted (it may have arrived via upload from a browser): rejects
 * symlinks/hard links, drops any entry outside database/ or uploads/, and
 * confirms the extracted database is actually a SQLite file rather than
 * trusting the archive's own naming. Returns the staging dir and the root
 * within it that holds database/ + uploads/ — caller must rmSync stagingDir
 * once done with it, including on the happy path.
 */
export async function extractBackupArchive(
  archivePath: string,
): Promise<{ stagingDir: string; payloadRoot: string }> {
  const stagingDir = mkdtempSync(join(tmpdir(), "workshop-restore-"));
  try {
    // filter must never throw — node-tar invokes it from inside its internal
    // stream/parser event handlers, outside this function's call stack, so a
    // thrown error here becomes an uncaught exception that crashes the
    // process instead of rejecting the tar.extract() promise. Record the
    // problem and reject entries by returning false instead; the recorded
    // reason is thrown below, back in normal control flow.
    let rejectionReason: string | null = null;
    await tar.extract({
      file: archivePath,
      cwd: stagingDir,
      strict: true,
      filter: (path, entry) => {
        // `entry` is typed as ReadEntry | Stats because tar's filter option
        // is shared with archive creation; during extract it's always a
        // ReadEntry, which is the one with `.type`.
        if ("type" in entry && (entry.type === "SymbolicLink" || entry.type === "Link")) {
          rejectionReason =
            "Archive contains a symlink or hard link, which isn't allowed in a backup.";
          return false;
        }
        return ALLOWED_ENTRY.test(path);
      },
    });
    if (rejectionReason) {
      throw new InvalidBackupArchiveError(rejectionReason);
    }

    // Defense in depth: node-tar already refuses entries that resolve
    // outside cwd and the filter above rejects link entries by type, but
    // re-check the extracted tree in case either of those has a gap.
    assertNoSymlinks(stagingDir);

    const payloadRoot = findPayloadRoot(stagingDir);
    const stagedDb = join(payloadRoot, "database", "workshop.db");
    if (!existsSync(stagedDb) || !isSqliteFile(stagedDb)) {
      throw new InvalidBackupArchiveError(
        "This file doesn't look like a workshop backup — no valid database found inside.",
      );
    }

    return { stagingDir, payloadRoot };
  } catch (err) {
    rmSync(stagingDir, { recursive: true, force: true });
    throw err;
  }
}

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

function assertNoSymlinks(dir: string): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) {
      throw new InvalidBackupArchiveError(
        "Archive contains a symlink or hard link, which isn't allowed in a backup.",
      );
    }
    if (entry.isDirectory()) {
      assertNoSymlinks(join(dir, entry.name));
    }
  }
}

function isSqliteFile(path: string): boolean {
  const fd = openSync(path, "r");
  try {
    const header = Buffer.alloc(SQLITE_MAGIC.length);
    readSync(fd, header, 0, header.length, 0);
    return header.equals(SQLITE_MAGIC);
  } finally {
    closeSync(fd);
  }
}
