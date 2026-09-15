import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Where the auto-generated secret is kept. Lives in DATA_DIR (the /data
 * volume in Docker) so it survives container recreation and image updates,
 * but deliberately *outside* database/ and uploads/ — a backup restore swaps
 * exactly those two directories, and shouldn't also sign everyone out.
 */
export function sessionSecretPath(): string {
  return join(process.env.DATA_DIR ?? "./data", "session-secret");
}

/**
 * The key that signs the session cookie. SESSION_SECRET still wins when set,
 * so existing deployments keep their current sessions after upgrading; unset
 * (the default now), a random key is generated on first boot and persisted,
 * the way most self-hosted apps handle it — nothing for the user to configure.
 *
 * Losing the file is harmless: a new key is generated and the only effect is
 * one more sign-in. Deleting it and restarting is also how to force-sign-out
 * every session without touching the password.
 */
export function resolveSessionSecret(): string {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv) {
    return fromEnv;
  }

  const path = sessionSecretPath();
  try {
    const existing = readFileSync(path, "utf8").trim();
    if (existing) {
      return existing;
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }

  const generated = randomBytes(32).toString("hex");
  mkdirSync(dirname(path), { recursive: true });
  // 0600: this key forges logins, so nothing else on the host should read it.
  writeFileSync(path, `${generated}\n`, { mode: 0o600 });
  console.log(`Generated a new session secret at ${path}.`);
  return generated;
}
