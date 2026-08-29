import type { FastifyInstance } from "fastify";
import { manualProvider } from "../providers/manualProvider.js";
import { createUpcItemDbProvider } from "../providers/upcItemDbProvider.js";
import type { CatalogProvider } from "../providers/types.js";

/**
 * Thin HTTP surface over the CatalogProvider architecture (see
 * apps/backend/src/providers/ and docs/PLAN.md §35.6). Never scrapes a
 * manufacturer site directly — see docs/DATA_SOURCES.md for why.
 */
const providers: Record<string, CatalogProvider> = {
  manual: manualProvider,
  upcitemdb: createUpcItemDbProvider(),
};

export async function catalogRoutes(app: FastifyInstance) {
  app.get("/api/catalog/search", async (req, reply) => {
    const { provider, q } = req.query as Record<string, string | undefined>;
    if (!q) return reply.code(400).send({ error: "missing_query" });

    const selected = providers[provider ?? "manual"];
    if (!selected) return reply.code(400).send({ error: "unknown_provider" });

    const results = await selected.searchModels(q);
    return { provider: selected.id, results };
  });
}
