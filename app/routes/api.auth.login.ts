import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.server";
import { authCredential } from "../db/schema";
import { checkCredentials } from "../lib/auth.server";
import { SESSION_MAX_AGE_MS, getSession, sessionStorage } from "../lib/session.server";
import { parseBody } from "../lib/validate.server";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function action({ request }: { request: Request }) {
  const body = parseBody(loginSchema, await request.json());

  if (!(await checkCredentials(body.username, body.password))) {
    return Response.json({ error: "invalid_credentials" }, { status: 401 });
  }

  // Re-read rather than have checkCredentials return it — keeps that
  // function a pure yes/no check with nothing for a caller to misuse.
  const credential = db
    .select()
    .from(authCredential)
    .where(eq(authCredential.username, body.username))
    .get();

  const session = await getSession(request.headers.get("Cookie"));
  session.set("authenticated", true);
  session.set("username", body.username);
  // Enforced server-side on every request — the cookie's own maxAge is only a
  // hint to the browser. See session.server.ts.
  session.set("expiresAt", Date.now() + SESSION_MAX_AGE_MS);
  session.set("passwordChangedAt", credential!.passwordChangedAt);

  return Response.json(
    { authenticated: true, username: body.username },
    { headers: { "Set-Cookie": await sessionStorage.commitSession(session) } },
  );
}
