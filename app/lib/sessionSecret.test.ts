import { mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveSessionSecret, sessionSecretPath } from "./sessionSecret.server";

const originalEnv = { DATA_DIR: process.env.DATA_DIR, SESSION_SECRET: process.env.SESSION_SECRET };

beforeEach(() => {
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "workshop-secret-test-"));
  delete process.env.SESSION_SECRET;
});

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("resolveSessionSecret", () => {
  it("prefers SESSION_SECRET and writes nothing when it's set", () => {
    process.env.SESSION_SECRET = "from-env";
    expect(resolveSessionSecret()).toBe("from-env");
    expect(() => statSync(sessionSecretPath())).toThrow();
  });

  it("generates a key on first boot and reuses it afterwards", () => {
    const first = resolveSessionSecret();
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(resolveSessionSecret()).toBe(first);
    expect(readFileSync(sessionSecretPath(), "utf8").trim()).toBe(first);
  });

  it("creates the file readable by the owner only", () => {
    resolveSessionSecret();
    expect(statSync(sessionSecretPath()).mode & 0o777).toBe(0o600);
  });

  // An empty value from compose's `${SESSION_SECRET:-}` must not become the key.
  it("treats an empty SESSION_SECRET as unset", () => {
    process.env.SESSION_SECRET = "";
    expect(resolveSessionSecret()).toMatch(/^[0-9a-f]{64}$/);
  });

  it("replaces an empty secret file instead of signing with an empty key", () => {
    writeFileSync(sessionSecretPath(), "\n");
    expect(resolveSessionSecret()).toMatch(/^[0-9a-f]{64}$/);
  });
});
