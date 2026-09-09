import { describe, expect, it } from "vitest";
import { parseTrustProxy } from "./trustProxy.server";

describe("parseTrustProxy", () => {
  it("defaults to off when unset or blank", () => {
    expect(parseTrustProxy(undefined)).toBeNull();
    expect(parseTrustProxy("")).toBeNull();
    expect(parseTrustProxy("   ")).toBeNull();
    expect(parseTrustProxy("false")).toBeNull();
  });

  it("reads a hop count as a number", () => {
    expect(parseTrustProxy("1")).toBe(1);
    expect(parseTrustProxy(" 2 ")).toBe(2);
  });

  it("passes presets and address lists through to Express", () => {
    expect(parseTrustProxy("loopback")).toBe("loopback");
    expect(parseTrustProxy("172.18.0.0/16")).toBe("172.18.0.0/16");
  });

  // Accepting this would let any client spoof X-Forwarded-For and spend a
  // fresh rate-limit budget per request — strictly worse than leaving the
  // setting off, so it fails at boot rather than at first request.
  it("refuses true", () => {
    expect(() => parseTrustProxy("true")).toThrow(/not accepted/);
  });
});
