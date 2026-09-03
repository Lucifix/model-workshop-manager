import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { checkCredentials } from "../lib/auth.js";
import { parseBody } from "../lib/validate.js";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  app.post(
    "/api/auth/login",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const body = parseBody(loginSchema, req.body, reply);
      if (!body) {
        return;
      }

      if (!checkCredentials(body.username, body.password)) {
        return reply.code(401).send({ error: "invalid_credentials" });
      }

      req.session.set("authenticated", true);
      req.session.set("username", body.username);
      return { authenticated: true, username: body.username };
    },
  );

  app.post("/api/auth/logout", async (req) => {
    req.session.delete();
    return { authenticated: false };
  });

  app.get("/api/auth/me", async (req) => {
    const authenticated = req.session.get("authenticated") === true;
    return {
      authenticated,
      username: authenticated ? req.session.get("username") : undefined,
    };
  });
}
