import { type RouteConfig, route, index, layout } from "@react-router/dev/routes";

export default [
  // --- UI routes (thin wrappers around the ported page components) ---------
  index("routes/ui.dashboard.tsx"),
  route("models", "routes/ui.models.tsx"),
  route("models/:id", "routes/ui.model-detail.tsx"),
  route("owned-models", "routes/ui.owned-models-redirect.tsx"),
  route("paints", "routes/ui.paints.tsx"),
  route("paints/:id", "routes/ui.paint-detail.tsx"),
  route("paint-inventory", "routes/ui.paint-inventory-redirect.tsx"),
  route("projects", "routes/ui.projects.tsx"),
  route("projects/new", "routes/ui.project-new.tsx"),
  route("projects/:id", "routes/ui.project-detail.tsx"),
  route("shopping-list", "routes/ui.shopping-list.tsx"),
  route("wishlist", "routes/ui.wishlist.tsx"),
  route("supplies", "routes/ui.supplies.tsx"),
  route("import-export", "routes/ui.import-export.tsx"),
  route("settings", "routes/ui.settings.tsx"),

  // --- Public API routes (reachable without a session) ----------------------
  // Keep this list to the bare minimum a client needs before logging in —
  // a route belongs here only if it must work without a session (checking
  // whether one exists, establishing one, or a liveness check). Everything
  // else belongs under the protected layout below, not here.
  route("api/health", "routes/api.health.ts"),
  route("api/auth/login", "routes/api.auth.login.ts"),
  route("api/auth/me", "routes/api.auth.me.ts"),
  route("api/auth/setup", "routes/api.auth.setup.ts"),

  // --- Protected API routes ---------------------------------------------
  // No UI component on any of these — loader/action return a Response
  // directly, same as before. Nested under api.protected.ts's middleware
  // (see that file for why), so a new route added here needs no separate
  // registration to be authenticated — only deliberately exempting one
  // requires action, by moving it out of this list.
  layout("routes/api.protected.ts", [
    route("api/auth/logout", "routes/api.auth.logout.ts"),
    route("api/auth/credential", "routes/api.auth.credential.ts"),

    route("api/manufacturers", "routes/api.manufacturers.ts"),
    route("api/manufacturers/:id", "routes/api.manufacturers.$id.ts"),

    route("api/paints", "routes/api.paints.ts"),
    route("api/paints/:id", "routes/api.paints.$id.ts"),

    route("api/models", "routes/api.models.ts"),
    route("api/models/:id", "routes/api.models.$id.ts"),
    route("api/models/:id/image", "routes/api.models.$id.image.ts"),
    route("api/models/:id/instructions", "routes/api.models.$id.instructions.ts"),
    route("api/models/:id/paints", "routes/api.models.$id.paints.ts"),
    route("api/models/:id/paints/:paintId", "routes/api.models.$id.paints.$paintId.ts"),

    route("api/tags", "routes/api.tags.ts"),

    route("api/inventory/models", "routes/api.inventory.models.ts"),
    route("api/inventory/models/:id", "routes/api.inventory.models.$id.ts"),
    route("api/inventory/paints", "routes/api.inventory.paints.ts"),
    route("api/inventory/paints/:id", "routes/api.inventory.paints.$id.ts"),

    route("api/projects", "routes/api.projects.ts"),
    route("api/projects/:id", "routes/api.projects.$id.ts"),
    route("api/projects/:id/log", "routes/api.projects.$id.log.ts"),
    route("api/projects/:id/photos", "routes/api.projects.$id.photos.ts"),
    route("api/projects/:id/photos/:photoId", "routes/api.projects.$id.photos.$photoId.ts"),
    route("api/projects/:id/paints", "routes/api.projects.$id.paints.ts"),
    route("api/projects/:id/paints/:paintId", "routes/api.projects.$id.paints.$paintId.ts"),

    route("api/supplies", "routes/api.supplies.ts"),
    route("api/supplies/:id", "routes/api.supplies.$id.ts"),

    route("api/shopping-list", "routes/api.shopping-list.ts"),
    route("api/shopping-list/:id/purchased", "routes/api.shopping-list.$id.purchased.ts"),

    route("api/wishlist", "routes/api.wishlist.ts"),
    route("api/wishlist/:id", "routes/api.wishlist.$id.ts"),
    route(
      "api/wishlist/:id/move-to-shopping-list",
      "routes/api.wishlist.$id.move-to-shopping-list.ts",
    ),

    route("api/dashboard", "routes/api.dashboard.ts"),

    route("api/import/manufacturers", "routes/api.import.manufacturers.ts"),
    route("api/import/paints", "routes/api.import.paints.ts"),
    route("api/import/models", "routes/api.import.models.ts"),
    route("api/export/paints", "routes/api.export.paints.ts"),
    route("api/export/models", "routes/api.export.models.ts"),
    route("api/export/manufacturers", "routes/api.export.manufacturers.ts"),
    route("api/export/all", "routes/api.export.all.ts"),

    route("api/catalog/providers", "routes/api.catalog.providers.ts"),
    route("api/catalog/search", "routes/api.catalog.search.ts"),
    route("api/catalog/seed-community-paints", "routes/api.catalog.seed-community-paints.ts"),

    route("api/backup", "routes/api.backup.ts"),
    route("api/backup/upload", "routes/api.backup.upload.ts"),
    route("api/backup/:filename/download", "routes/api.backup.$filename.download.ts"),
    route("api/backup/:filename/restore", "routes/api.backup.$filename.restore.ts"),
    route("api/backup/:filename", "routes/api.backup.$filename.ts"),

    route("api/settings", "routes/api.settings.ts"),
  ]),
] satisfies RouteConfig;
