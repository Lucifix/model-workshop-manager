import { z } from "zod";
import { db } from "../db/client.server";
import { authCredential } from "../db/schema";
import { hasCredential } from "../lib/credentials.server";
import { hashPassword } from "../lib/passwordHash.server";
import { SESSION_MAX_AGE_MS, getSession, sessionStorage } from "../lib/session.server";
import { parseBody } from "../lib/validate.server";
import { conflict } from "../lib/api.server";

const setupSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(8),
});

/**
 * One-time: creates the single auth_credential row and logs the caller in
 * immediately, the way Jellyfin/Immich-style first-run setup screens do.
 * Public (see routes.ts) because there's no session yet to gate it with —
 * hasCredential() is what actually closes this off, checked here rather
 * than only inferred from the client's UI state, so it can't be replayed
 * once setup is done.
 */
export async function action({ request }: { request: Request }) {
  if (hasCredential()) {
    return conflict("already_configured", "Setup has already been completed.");
  }

  const body = parseBody(setupSchema, await request.json());

  const [credential] = await db
    .insert(authCredential)
    .values({ username: body.username, passwordHash: await hashPassword(body.password) })
    .returning();

  const session = await getSession(request.headers.get("Cookie"));
  session.set("authenticated", true);
  session.set("username", body.username);
  session.set("expiresAt", Date.now() + SESSION_MAX_AGE_MS);
  session.set("passwordChangedAt", credential!.passwordChangedAt);

  return Response.json(
    { authenticated: true, username: body.username },
    { headers: { "Set-Cookie": await sessionStorage.commitSession(session) } },
  );
}
