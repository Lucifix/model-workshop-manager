import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const SALT_BYTES = 16;
const KEY_LENGTH = 64;

// Node's built-in scrypt rather than a new dependency (argon2 needs either a
// native build or a prebuilt-binary package) — adequate here since the
// "database" being protected is a single row that only leaks if the SQLite
// file itself is already exposed, at which point the rest of the data leaked
// with it. The "scrypt:" prefix means a future algorithm change is a
// dispatch on the prefix in verifyPassword, not a migration.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = hash.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) {
    return false;
  }
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derived = (await scryptAsync(password, salt, expected.length)) as Buffer;
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
