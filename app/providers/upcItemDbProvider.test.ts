import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

// client.server.ts reads DATABASE_URL at module scope, so it has to be set
// before the dynamic imports below — same reasoning as credentials.test.ts.
process.env.DATABASE_URL = join(mkdtempSync(join(tmpdir(), "workshop-upcitemdb-test-")), "test.db");

let db: typeof import("../db/client.server.js").db;
let appSettings: typeof import("../db/schema.js").appSettings;
let createUpcItemDbProvider: typeof import("./upcItemDbProvider.js").createUpcItemDbProvider;
let isEnabled: typeof import("./upcItemDbProvider.js").isEnabled;

beforeAll(async () => {
  const { runMigrations } = await import("../db/migrate.server.js");
  runMigrations();

  ({ db } = await import("../db/client.server.js"));
  ({ appSettings } = await import("../db/schema.js"));
  ({ createUpcItemDbProvider, isEnabled } = await import("./upcItemDbProvider.js"));
});

beforeEach(() => {
  db.delete(appSettings).run();
  delete process.env.UPCITEMDB_ENABLED;
});

afterEach(() => {
  delete process.env.UPCITEMDB_ENABLED;
});

describe("isEnabled", () => {
  it("is off by default, with no settings row and no env var", () => {
    expect(isEnabled()).toBe(false);
  });

  it("follows the Settings toggle once a row exists", () => {
    db.insert(appSettings).values({ id: 1, upcItemDbEnabled: true }).run();
    expect(isEnabled()).toBe(true);
  });

  it("re-checks the settings row on every call, not just at provider creation", () => {
    db.insert(appSettings).values({ id: 1, upcItemDbEnabled: false }).run();
    expect(isEnabled()).toBe(false);

    db.update(appSettings).set({ upcItemDbEnabled: true }).run();
    expect(isEnabled()).toBe(true);
  });

  it("stays enabled via UPCITEMDB_ENABLED=true even when the Settings toggle is off", () => {
    db.insert(appSettings).values({ id: 1, upcItemDbEnabled: false }).run();
    process.env.UPCITEMDB_ENABLED = "true";
    expect(isEnabled()).toBe(true);
  });
});

describe("createUpcItemDbProvider", () => {
  it("exposes enabled as a live view of isEnabled(), not a snapshot", () => {
    const provider = createUpcItemDbProvider();
    expect(provider.enabled).toBe(false);

    db.insert(appSettings).values({ id: 1, upcItemDbEnabled: true }).run();
    expect(provider.enabled).toBe(true);
  });
});
