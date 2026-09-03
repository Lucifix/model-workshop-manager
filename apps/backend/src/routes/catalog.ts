import type { FastifyInstance } from "fastify";
import { manualProvider } from "../providers/manualProvider.js";
import { createUpcItemDbProvider } from "../providers/upcItemDbProvider.js";
import type { CatalogProvider } from "../providers/types.js";
import { importMiniaturePaints } from "../scripts/importMiniaturePaints.js";

/**
 * Thin HTTP surface over the CatalogProvider architecture (see
 * apps/backend/src/providers/). Never scrapes a manufacturer site directly —
 * see the comment on CatalogProvider in providers/types.ts for why.
 */
const providers: Record<string, CatalogProvider> = {
  manual: manualProvider,
  upcitemdb: createUpcItemDbProvider(),
};

export async function catalogRoutes(app: FastifyInstance) {
  app.get("/api/catalog/providers", async () => {
    return Object.values(providers)
      .filter((p) => p.enabled !== false)
      .map((p) => ({ id: p.id, label: p.label }));
  });

  app.get("/api/catalog/search", async (req, reply) => {
    const { provider, q } = req.query as Record<string, string | undefined>;
    if (!q) {
      return reply.code(400).send({ error: "missing_query" });
    }

    const selected = providers[provider ?? "manual"];
    if (!selected) {
      return reply.code(400).send({ error: "unknown_provider" });
    }

    const results = await selected.searchModels(q);
    return { provider: selected.id, results };
  });

  /**
   * One-click onboarding action: pulls the MIT-licensed community paint
   * dataset (github.com/Arcturus5404/miniature-paints) into the catalog.
   * Opt-in and button-triggered from Import & Export — not run automatically
   * on startup. Safe to call repeatedly; upserts dedupe on product code.
   */
  app.post("/api/catalog/seed-community-paints", async () => {
    return importMiniaturePaints();
  });
}
