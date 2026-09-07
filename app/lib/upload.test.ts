import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// UPLOAD_DIR is read once at module load, so the temp dir has to be in the
// environment before the dynamic import below.
const uploadDir = mkdtempSync(join(tmpdir(), "workshop-upload-test-"));
process.env.UPLOAD_DIR = uploadDir;

let upload: typeof import("./upload.server.js");

beforeAll(async () => {
  upload = await import("./upload.server.js");
});

afterAll(() => {
  rmSync(uploadDir, { recursive: true, force: true });
});

describe("saveUploadedFile", () => {
  it("stores an allowed image under a server-derived extension", async () => {
    const file = new File(["fake-png-bytes"], "holiday snap.png", { type: "image/png" });
    const saved = await upload.saveUploadedFile(file, upload.IMAGE_UPLOAD_TYPES, "projects", "1");

    expect(saved.filename).toMatch(/\.png$/);
    expect(saved.url).toBe(`/uploads/${saved.relativePath}`);
    expect(readdirSync(join(uploadDir, "projects", "1"))).toContain(saved.filename);
  });

  // The client's filename decides nothing: express.static picks the response
  // Content-Type off the stored extension, so a .html name on an allowed type
  // must not survive to disk.
  it("ignores the client's filename when deriving the extension", async () => {
    const file = new File(["<script>alert(1)</script>"], "evil.html", { type: "image/png" });
    const saved = await upload.saveUploadedFile(file, upload.IMAGE_UPLOAD_TYPES, "projects", "2");

    expect(saved.filename).toMatch(/\.png$/);
    expect(saved.filename).not.toContain("evil");
    expect(saved.filename).not.toContain(".html");
  });

  it("rejects a content type outside the allow-list", async () => {
    const file = new File(["<script>alert(1)</script>"], "evil.html", { type: "text/html" });
    let thrown: unknown;
    try {
      await upload.saveUploadedFile(file, upload.IMAGE_UPLOAD_TYPES, "projects", "3");
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(Response);
    const response = thrown as Response;
    expect(response.status).toBe(415);
    await expect(response.json()).resolves.toMatchObject({ error: "unsupported_file_type" });
  });

  // SVG passes an `image/*` file picker but executes script when served
  // inline, so it is deliberately absent from IMAGE_UPLOAD_TYPES.
  it("rejects SVG even though the picker offers it as an image", async () => {
    const file = new File(["<svg onload='alert(1)'/>"], "x.svg", { type: "image/svg+xml" });
    await expect(
      upload.saveUploadedFile(file, upload.IMAGE_UPLOAD_TYPES, "projects", "4"),
    ).rejects.toSatisfy((err: Response) => err.status === 415);
  });

  it("keeps the image and PDF allow-lists disjoint", async () => {
    const pdf = new File(["%PDF-1.4"], "manual.pdf", { type: "application/pdf" });
    await expect(
      upload.saveUploadedFile(pdf, upload.IMAGE_UPLOAD_TYPES, "models", "1"),
    ).rejects.toSatisfy((err: Response) => err.status === 415);

    const saved = await upload.saveUploadedFile(pdf, upload.PDF_UPLOAD_TYPES, "models", "1");
    expect(saved.filename).toMatch(/\.pdf$/);
  });
});
