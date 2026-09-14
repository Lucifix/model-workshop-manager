import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

// client.server.ts reads DATABASE_URL at module scope, so it has to be set
// before the dynamic imports below — same reasoning as session.test.ts.
process.env.DATABASE_URL = join(
  mkdtempSync(join(tmpdir(), "workshop-credentials-test-")),
  "test.db",
);

let db: typeof import("../db/client.server.js").db;
let authCredential: typeof import("../db/schema.js").authCredential;
let ensureCredential: typeof import("./credentials.server.js").ensureCredential;
let hasCredential: typeof import("./credentials.server.js").hasCredential;

beforeAll(async () => {
  const { runMigrations } = await import("../db/migrate.server.js");
  runMigrations();

  ({ db } = await import("../db/client.server.js"));
  ({ authCredential } = await import("../db/schema.js"));
  ({ ensureCredential, hasCredential } = await import("./credentials.server.js"));
});

beforeEach(() => {
  db.delete(authCredential).run();
  delete process.env.AUTH_USERNAME;
  delete process.env.AUTH_PASSWORD;
});

describe("ensureCredential", () => {
  it("does nothing when a credential already exists", async () => {
    db.insert(authCredential).values({ username: "existing", passwordHash: "scrypt:a:b" }).run();
    await ensureCredential();
    expect(db.select().from(authCredential).get()?.username).toBe("existing");
  });

  it("migrates AUTH_USERNAME/AUTH_PASSWORD into a row when none exists", async () => {
    process.env.AUTH_USERNAME = "admin";
    process.env.AUTH_PASSWORD = "correct horse battery staple";
    await ensureCredential();
    const row = db.select().from(authCredential).get();
    expect(row?.username).toBe("admin");
    expect(row?.passwordHash.startsWith("scrypt:")).toBe(true);
  });

  it("leaves hasCredential() false on a fresh install with no env vars", async () => {
    await ensureCredential();
    expect(hasCredential()).toBe(false);
  });

  it("does not migrate when only one of the two env vars is set", async () => {
    process.env.AUTH_USERNAME = "admin";
    await ensureCredential();
    expect(hasCredential()).toBe(false);
  });
});
