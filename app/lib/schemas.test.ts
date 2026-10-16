import { describe, expect, expectTypeOf, it } from "vitest";
import {
  isHttpUrl,
  paintInventoryCreateSchema,
  paintInventoryUpdateSchema,
  projectCreateSchema,
  projectUpdateSchema,
  supplyCreateSchema,
  supplyUpdateSchema,
  wishlistCreateSchema,
  wishlistUpdateSchema,
} from "./schemas";

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

// Issue #14: Zod 4 applies .default() inside .partial(), so a PATCH that only
// sent progressPercent also reset status to "Planned" (and vice versa).
describe("update schemas don't apply create-time defaults", () => {
  it("project: a progress-only PATCH leaves status untouched", () => {
    expect(projectUpdateSchema.parse({ progressPercent: 50 })).toEqual({ progressPercent: 50 });
  });

  it("project: a status-only PATCH leaves progress untouched", () => {
    expect(projectUpdateSchema.parse({ status: "In Progress" })).toEqual({ status: "In Progress" });
  });

  it.each([
    ["paintInventory", paintInventoryUpdateSchema],
    ["supply", supplyUpdateSchema],
    ["wishlist", wishlistUpdateSchema],
    ["project", projectUpdateSchema],
  ] as const)("%s: an empty PATCH parses to an empty object", (_name, schema) => {
    expect(schema.parse({})).toEqual({});
  });

  it("still validates the fields that are sent", () => {
    expect(projectUpdateSchema.safeParse({ progressPercent: 101 }).success).toBe(false);
    expect(projectUpdateSchema.safeParse({ status: "Nope" }).success).toBe(false);
    expect(paintInventoryUpdateSchema.safeParse({ fillLevel: "Nope" }).success).toBe(false);
  });

  it("keeps the field types (minus the defaults)", () => {
    expectTypeOf(projectUpdateSchema.parse({}).status).toEqualTypeOf<
      typeof projectCreateSchema._output.status | undefined
    >();
    expectTypeOf(supplyUpdateSchema.parse({}).quantity).toEqualTypeOf<number | undefined>();
  });

  it("create schemas keep their defaults", () => {
    expect(projectCreateSchema.parse({ modelId: 1, name: "Build" })).toMatchObject({
      status: "Planned",
      progressPercent: 0,
    });
    expect(paintInventoryCreateSchema.parse({ paintId: 1 })).toMatchObject({
      quantity: 1,
      fillLevel: "Full",
    });
    expect(supplyCreateSchema.parse({ name: "Glue" })).toMatchObject({ quantity: 1 });
    expect(wishlistCreateSchema.parse({ description: "Thing" })).toMatchObject({
      priority: "normal",
    });
  });
});
