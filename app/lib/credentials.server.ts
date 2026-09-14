import { db } from "../db/client.server";
import { authCredential } from "../db/schema";
import { hashPassword } from "./passwordHash.server";

export function hasCredential(): boolean {
  return db.select({ id: authCredential.id }).from(authCredential).get() !== undefined;
}

/**
 * Called once at boot, after migrations. Three states:
 *  - a credential row already exists: normal operation.
 *  - no row, but AUTH_USERNAME/AUTH_PASSWORD are set: this is an existing
 *    deployment upgrading — migrate them into the row so login keeps working
 *    with no action required. The env vars are never read again after this.
 *  - neither: a genuinely fresh install. Nothing to do here — the client
 *    shows the setup screen (see routes/api.auth.setup.ts) until it's used.
 */
export async function ensureCredential(): Promise<void> {
  if (hasCredential()) {
    if (process.env.AUTH_PASSWORD) {
      console.warn(
        "AUTH_PASSWORD is set but ignored — a credential already exists. " +
          "Change your password via Settings, or run `npm run auth:reset` to start over.",
      );
    }
    return;
  }

  const { AUTH_USERNAME, AUTH_PASSWORD } = process.env;
  if (AUTH_USERNAME && AUTH_PASSWORD) {
    db.insert(authCredential)
      .values({ username: AUTH_USERNAME, passwordHash: await hashPassword(AUTH_PASSWORD) })
      .run();
    console.log(
      "Credential created from AUTH_USERNAME/AUTH_PASSWORD — " +
        "you can remove both from .env now, they won't be read again.",
    );
  }
}
