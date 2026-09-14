import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.server";
import { authCredential } from "../db/schema";
import { hashPassword, verifyPassword } from "../lib/passwordHash.server";
import { parseBody } from "../lib/validate.server";
import { badRequest, methodNotAllowed, notFound } from "../lib/api.server";

const credentialUpdateSchema = z.object({
  currentPassword: z.string().min(1),
  newUsername: z.string().min(1).optional(),
  newPassword: z.string().min(8).optional(),
});

/** Change the one account's username/password from Settings. Requires the
 * current password even though the caller already has a valid session — the
 * session cookie could be a while old, and this is the one action where
 * knowing you're still you, not just still logged in, actually matters. */
export async function action({ request }: { request: Request }) {
  if (request.method !== "PATCH") {
    return methodNotAllowed();
  }

  const body = parseBody(credentialUpdateSchema, await request.json());

  const credential = db.select().from(authCredential).get();
  if (!credential) {
    return notFound();
  }
  if (!(await verifyPassword(credential.passwordHash, body.currentPassword))) {
    return badRequest("invalid_current_password");
  }

  const passwordHash = body.newPassword ? await hashPassword(body.newPassword) : undefined;
  const [updated] = await db
    .update(authCredential)
    .set({
      username: body.newUsername ?? undefined,
      passwordHash,
      // Bumping this even when only the username changed keeps the rule
      // simple ("any credential change signs out other sessions") rather
      // than conditional on which field moved.
      passwordChangedAt: sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
    })
    .where(sql`${authCredential.id} = ${credential.id}`)
    .returning();

  return Response.json({ username: updated!.username });
}
