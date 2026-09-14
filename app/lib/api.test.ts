import { describe, expect, it } from "vitest";
import { idParam } from "./api.server";

describe("idParam", () => {
  it("parses a valid positive integer", () => {
    expect(idParam({ id: "42" })).toBe(42);
  });

  it("supports a custom param key", () => {
    expect(idParam({ paintId: "7" }, "paintId")).toBe(7);
  });

  it.each(["abc", "1abc", "-1", "1.5", "0", "1e99", undefined])(
    "rejects %p with a 400",
    (value) => {
      let thrown: unknown;
      try {
        idParam({ id: value });
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toBeInstanceOf(Response);
      expect((thrown as Response).status).toBe(400);
    },
  );
});
