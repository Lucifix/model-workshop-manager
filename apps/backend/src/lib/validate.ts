import type { ZodSchema } from "zod";
import type { FastifyReply } from "fastify";

export function parseBody<T>(schema: ZodSchema<T>, body: unknown, reply: FastifyReply): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    reply.code(400).send({ error: "validation_error", details: result.error.flatten() });
    return null;
  }
  return result.data;
}
