import { createReadStream, existsSync, statSync } from "node:fs";
import { Readable } from "node:stream";
import { join } from "node:path";
import { badRequest, notFound } from "../lib/api.server";
import { isValidFilename } from "../lib/backupFile.server";

const BACKUP_DIR = process.env.BACKUP_DIR ?? "./backups";

export async function loader({ params }: { params: { filename: string } }) {
  const { filename } = params;
  if (!isValidFilename(filename)) {
    return badRequest("invalid_filename");
  }

  const filePath = join(BACKUP_DIR, filename);
  if (!existsSync(filePath)) {
    return notFound();
  }

  const stat = statSync(filePath);
  return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "application/gzip",
      "Content-Length": String(stat.size),
    },
  });
}
