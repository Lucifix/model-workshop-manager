import { db } from "./client.server";
import { authCredential } from "./schema";

// Forgot-password path for a single-user app with no email service — the
// standard answer for this class of self-hosted tool (Immich, Nextcloud,
// Gitea all converge on a CLI reset rather than a mail flow). Deletes the
// one credential row; the next boot's ensureCredential() (see
// lib/credentials.server.ts) either falls back to the setup screen — the
// exact same code path as a fresh install — or, if AUTH_USERNAME/
// AUTH_PASSWORD are still set in .env, quietly re-seeds the old login from
// them instead. Requires host/container shell access, which is the right
// bar: unlike an env var, there's no standing backdoor left behind.
function resetCredential() {
  db.delete(authCredential).run();
}

resetCredential();

if (process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD) {
  console.log(
    "Credential cleared — but AUTH_USERNAME/AUTH_PASSWORD are still set in .env, so the " +
      "next restart will recreate the login from those instead of showing the setup screen. " +
      "Remove them from .env first if you want a blank setup screen.",
  );
} else {
  console.log("Credential cleared — the app will show the setup screen again.");
}
