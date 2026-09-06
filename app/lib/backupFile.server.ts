const FILENAME_PATTERN = /^[\w.-]+\.tar\.gz$/;

export function isValidFilename(filename: string): boolean {
  return FILENAME_PATTERN.test(filename) && !filename.includes("..");
}
