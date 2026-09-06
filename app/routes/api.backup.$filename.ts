import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { badRequest, notFound, noContent } from "../lib/api.server";
import { isValidFilename } from "../lib/backupFile.server";

const BACKUP_DIR = process.env.BACKUP_DIR ?? "./backups";

export async function action({ params }: { params: { filename: string } }) {
  const { filename } = params;
  if (!isValidFilename(filename)) {
    return badRequest("invalid_filename");
  }

  const filePath = join(BACKUP_DIR, filename);
  if (!existsSync(filePath)) {
    return notFound();
  }

  rmSync(filePath);
  return noContent();
}
