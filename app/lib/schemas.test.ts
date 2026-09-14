import { describe, expect, it } from "vitest";
import { isHttpUrl } from "./schemas";

describe("isHttpUrl", () => {
  it("accepts http(s) URLs", () => {
    expect(isHttpUrl("https://example.com")).toBe(true);
    expect(isHttpUrl("http://example.com/path?q=1")).toBe(true);
  });

  // z.string().url() accepts any scheme that new URL() parses, including
  // these — and these values render as href/src elsewhere in the app.
  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
  ])("rejects %p", (value) => {
    expect(isHttpUrl(value)).toBe(false);
  });

  it("rejects malformed strings", () => {
    expect(isHttpUrl("not-a-url")).toBe(false);
  });
});
