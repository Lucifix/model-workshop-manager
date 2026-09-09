const FILENAME_PATTERN = /^[\w.-]+\.tar\.gz$/;

export function isValidFilename(filename: string): boolean {
  return FILENAME_PATTERN.test(filename) && !filename.includes("..");
}

/**
 * A backup bundles the SQLite database plus every uploaded photo, so it runs
 * far past the global request-body cap in server/app.ts — which is why that
 * cap exempts this one route and defers to this limit instead. Both sides
 * import this constant rather than each naming their own: they disagreed
 * once already, and the 50 MB global guard silently won, rejecting any
 * restore of a backup that had photos in it.
 */
export const MAX_BACKUP_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024; // 2 GiB

/**
 * The upload route this cap belongs to. Lower-cased and compared as such:
 * React Router matches routes case-insensitively, so /API/Backup/upload
 * reaches the route (and its own size check) either way — a case-sensitive
 * comparison here would hand those requests the 50 MB cap instead.
 */
export const BACKUP_UPLOAD_PATH = "/api/backup/upload";
