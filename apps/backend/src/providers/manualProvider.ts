import type { CatalogProvider } from "./types.js";

/**
 * The manual provider never returns search results — it exists so the
 * "Add Model" / "Add Paint" workflows can always fall back to "create
 * manually" as a first-class option, never a hidden edge case.
 */
export const manualProvider: CatalogProvider = {
  id: "manual",
  label: "Manual entry",
  async searchModels() {
    return [];
  },
  async getModel() {
    return null;
  },
  async searchPaints() {
    return [];
  },
};
