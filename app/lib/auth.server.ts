import { randomBytes } from "node:crypto";
import { db } from "../db/client.server";
import { authCredential } from "../db/schema";
import { hashPassword, verifyPassword } from "./passwordHash.server";

// A wrong username must still pay the same scrypt cost as a wrong password
// against a real account — otherwise response time alone reveals which one
// it was. Hashed once per process against a value nobody could guess, and
// reused as the comparison target whenever there's no real row to check.
const dummyHash = hashPassword(randomBytes(32).toString("hex"));

/**
 * Single-user credential check against the one-row auth_credential table
 * (see db/schema.ts and lib/credentials.server.ts). This app is explicitly
 * single-user by design — a full users table would be over-engineering.
 */
export async function checkCredentials(username: string, password: string): Promise<boolean> {
  const row = db.select().from(authCredential).get();
  const matchesUsername = row !== undefined && row.username === username;
  const validPassword = await verifyPassword(
    matchesUsername ? row.passwordHash : await dummyHash,
    password,
  );
  return matchesUsername && validPassword;
}

/**
 * /uploads/* is served by express.static in server/app.ts, entirely outside
 * React Router, so it can't be gated by route-tree middleware the way
 * /api/* is (see app/routes/api.protected.ts) — it needs this standalone
 * check instead. Every uploaded file requires a session; there is no public
 * exception here the way there is for a handful of /api/* routes.
 *
 * Matched case-insensitively even though express.static's filesystem lookup
 * is case-sensitive: Express's own mount-path matching (the "/uploads"
 * prefix server/app.ts registers express.static under) is not case-sensitive
 * by default, so a case-sensitive check here could still let a
 * case-differing request through to a static lookup that succeeds anyway.
 */
export function isUploadPath(path: string): boolean {
  return path.toLowerCase().startsWith("/uploads/");
}
