import { describe, it, expect } from "vitest";
import { isUploadPath } from "./auth.server.js";

describe("isUploadPath", () => {
  it("guards the uploads prefix", () => {
    expect(isUploadPath("/uploads/projects/1/photo.jpg")).toBe(true);
  });

  it("leaves everything else unguarded", () => {
    expect(isUploadPath("/")).toBe(false);
    expect(isUploadPath("/models")).toBe(false);
    expect(isUploadPath("/assets/root-abc123.js")).toBe(false);
    // /api/* auth is enforced by React Router route middleware now (see
    // app/routes/api.protected.ts), not by this function.
    expect(isUploadPath("/api/models")).toBe(false);
  });

  // Express's own "/uploads" mount-path matching is case-insensitive by
  // default, so a request in a different case still reaches express.static
  // and can resolve against an on-disk file — this check has to recognize
  // that spelling too, or it hands such a request through unauthenticated.
  it("guards case-variant spellings of the uploads prefix", () => {
    expect(isUploadPath("/UPLOADS/projects/1/photo.jpg")).toBe(true);
    expect(isUploadPath("/Uploads/projects/1/photo.jpg")).toBe(true);
  });
});
