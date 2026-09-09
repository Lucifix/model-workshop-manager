import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as tar from "tar";
import { afterAll, describe, expect, it } from "vitest";
import { InvalidBackupArchiveError, extractBackupArchive } from "./backupArchive.server";

const workDir = mkdtempSync(join(tmpdir(), "workshop-archive-test-"));

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true });
});

/** Builds a minimal but valid backup: database/workshop.db with real SQLite magic. */
function makeArchive(name: string, dbBytes: number): string {
  const payload = join(workDir, name);
  mkdirSync(join(payload, "database"), { recursive: true });
  const db = Buffer.alloc(dbBytes);
  Buffer.from("SQLite format 3\0", "utf8").copy(db);
  writeFileSync(join(payload, "database", "workshop.db"), db);

  const archivePath = join(workDir, `${name}.tar.gz`);
  tar.create({ gzip: true, file: archivePath, cwd: payload, sync: true }, ["database"]);
  return archivePath;
}

describe("extractBackupArchive", () => {
  it("extracts an archive that fits under the limit", async () => {
    const { stagingDir, payloadRoot } = await extractBackupArchive(makeArchive("ok", 1024));
    try {
      expect(payloadRoot).toBe(stagingDir);
    } finally {
      rmSync(stagingDir, { recursive: true, force: true });
    }
  });

  // An all-zero file compresses to almost nothing, which is the shape of the
  // problem: archive size says nothing about what lands on disk.
  it("rejects an archive that expands past the limit", async () => {
    const archivePath = makeArchive("bomb", 64 * 1024);
    // Asserting the message, not just the type: dropping the database entry
    // also trips the "no valid database" check further down, which throws the
    // same error — a type-only assertion would pass without the cap existing.
    await expect(extractBackupArchive(archivePath, 1024)).rejects.toThrow(/expands to more than/);
    await expect(extractBackupArchive(archivePath, 1024)).rejects.toBeInstanceOf(
      InvalidBackupArchiveError,
    );
  });

  it("leaves no staging directory behind when it rejects one", async () => {
    const before = new Set(readdirSync(tmpdir()));
    await expect(extractBackupArchive(makeArchive("bomb2", 64 * 1024), 1024)).rejects.toThrow();
    const leaked = readdirSync(tmpdir()).filter(
      (entry) => entry.startsWith("workshop-restore-") && !before.has(entry),
    );
    expect(leaked).toEqual([]);
  });
});
