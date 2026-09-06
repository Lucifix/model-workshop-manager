import { importMiniaturePaints } from "../scripts/importMiniaturePaints.server";

/**
 * One-click onboarding action: pulls the MIT-licensed community paint
 * dataset (github.com/Arcturus5404/miniature-paints) into the catalog.
 * Opt-in and button-triggered from Import & Export — not run automatically
 * on startup. Safe to call repeatedly; upserts dedupe on product code.
 */
export async function action() {
  return Response.json(await importMiniaturePaints());
}
