import { manualProvider } from "../providers/manualProvider";
import { createUpcItemDbProvider } from "../providers/upcItemDbProvider";
import type { CatalogProvider } from "../providers/types";

/**
 * Thin HTTP surface over the CatalogProvider architecture (see
 * app/providers/). Never scrapes a manufacturer site directly — see the
 * comment on CatalogProvider in providers/types.ts for why.
 */
export const providers: Record<string, CatalogProvider> = {
  manual: manualProvider,
  upcitemdb: createUpcItemDbProvider(),
};
