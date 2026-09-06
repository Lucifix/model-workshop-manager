import type { ZodSchema } from "zod";

export class ValidationError extends Response {
  constructor(details: unknown) {
    super(JSON.stringify({ error: "validation_error", details }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/** Throws a 400 Response on failure so route actions can call this and let
 * React Router's error handling propagate it, mirroring the old parseBody(). */
export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten());
  }
  return result.data;
}
