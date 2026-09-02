# Architecture Proposal (Phase 1)

## Stack (as specified)
Frontend: React + TypeScript + Vite + React Router + Tailwind + shadcn/ui + TanStack Query + Zod + vite-plugin-pwa
Backend: Node.js + TypeScript + Fastify + Drizzle ORM + SQLite (better-sqlite3 driver)
Infra: Docker + Docker Compose + reverse-proxy-friendly + named volumes

## Monorepo layout

```
model-workshop-manager/
  apps/
    backend/          Fastify API, Drizzle schema/migrations, providers, seed
    frontend/          React PWA
  data/                bind-mounted in dev; becomes a named volume in prod
    database/workshop.db
    uploads/projects/{projectId}/...
    backups/
  docs/                ARCHITECTURE.md, DATA_SOURCES.md, ORIGINAL_SPEC.md
  scripts/
    backup.sh
  docker-compose.yml
  .env.example
```

## Request flow

```
Browser (PWA)
  -> React app (TanStack Query + fetch)
    -> Fastify REST API (/api/*)
      -> Drizzle ORM
        -> SQLite (/data/database/workshop.db)

Photo uploads -> Fastify multipart -> filesystem (/data/uploads/projects/{id}/...)
                 -> only path/metadata written to SQLite
```

Two containers: `backend` (serves `/api/*` and, in prod, the built frontend static files) and
`frontend` (dev server only; in prod its build output is copied into/served by backend or an
nginx-compatible proxy container the user already runs on Technest). Kept intentionally simple
per §32 — no separate object storage, no message queue, no GraphQL gateway.

## Why this shape

- **SQLite over Postgres**: single-user, single-host, personal data. One file, trivial backup
  (copy the file), zero extra container. Drizzle makes a later Postgres migration mechanical
  if ever needed.
- **Filesystem for images, not BLOBs**: keeps the DB small/fast and lets you rsync/view photos
  directly; SQLite stores only `filename`/path + metadata (per spec §4).
- **Catalog vs. Inventory vs. Build, as three separate table families** (§6): a `models` row
  never gains an "owned" or "progress" column. Ownership lives in `owned_models`, build state
  lives in `projects`. This is enforced at the schema level, not just convention — see schema
  below and `docs/DATA_SOURCES.md` for why catalog data is import-based rather than live-synced.
- **`CatalogProvider` interface**: search/get are the only two capabilities every provider must
  support; anything provider-specific (rate limits, auth, CSV column mapping) stays inside that
  provider's implementation, never leaks into route handlers.
- **Zod at the API boundary**: request bodies are validated before they reach Drizzle; the same
  Zod schemas are exported so the frontend can validate forms with the identical rules (shared
  via a small `packages/shared`-style export from backend's `src/schemas` — imported by path in
  dev, published as a workspace package if this grows).

## Database schema (Drizzle, SQLite)

See `apps/backend/src/db/schema.ts` for the authoritative definitions. Table families:

- **Catalog** (never touched by "my" data): `manufacturers`, `paints`, `models`, `model_paints`,
  `tags`, `model_tags` (free-form multi-tag layer, additive alongside `models.category`)
- **My inventory** (ownership only, no build state): `owned_models`, `paint_inventory`
- **My builds** (build state only, references a catalog model): `projects`, `project_paints`,
  `build_log_entries`, `project_photos`
- **Cross-cutting**: `shopping_list_items`, `wishlist_items` ("want, not buying yet" — distinct
  from the "buying soon" shopping list), `supplies` (generic tools/consumables inventory)

Foreign keys: `paints.manufacturer_id -> manufacturers.id`, `models.manufacturer_id ->
manufacturers.id`, `model_paints.{model_id,paint_id}`, `owned_models.model_id -> models.id`,
`paint_inventory.paint_id -> paints.id`, `projects.model_id -> models.id`,
`project_paints.{project_id,paint_id}`, `build_log_entries.project_id`,
`project_photos.project_id`, `shopping_list_items.paint_id` (nullable, for non-paint supply
items).

## Import / provider architecture

```ts
interface CatalogProvider {
  id: string;                 // "manual" | "csv" | "upcitemdb" | future: "revell-official"
  searchModels(query: string): Promise<ModelResult[]>;
  getModel(externalId: string): Promise<ModelDetails | null>;
  searchPaints(query: string): Promise<PaintResult[]>;
}
```

Implemented in MVP: `ManualProvider` (no-op search, used only for the "create manually" path),
`CsvImportProvider` (reads an uploaded CSV/JSON against a documented column mapping and upserts
catalog rows with `source`/`source_url` set to the file name), `UpcItemDbProvider` (optional,
disabled unless `UPCITEMDB_ENABLED=true`, since it's an external network call from a
self-hosted app that otherwise makes none).

## Phase history

The app was built out in phases, tracked in full in `docs/ORIGINAL_SPEC.md` (the original brief)
and its §35 addendum. Summary, in build order:

1. **Phase 1**: research, schema, folder structure, monorepo skeleton, backend with Drizzle
   schema + migrations + health check + seed data, frontend Vite/PWA shell with routing and a
   live Dashboard, Docker Compose, docs.
2. **Phase 2**: full Models/Paints CRUD UI, personal inventory screens, dashboard wired to real
   aggregates.
3. **Phase 3**: projects/builds, build log, photo upload UI, paint-availability matching UI,
   shopping list UI.
4. **Phase 4**: CSV/JSON importer UI, provenance display, UPCitemdb toggle.
5. **Phase 5**: polish, tests, PWA offline shell, backup/restore docs, mobile pass.
6. **Phase 6** (addendum): streamlined "Add Model" / "New Build" workflow, manufacturer picker,
   model image upload.

Since then, outside the original phase plan: single-user authentication (login page, signed
session cookie, rate-limited login), a Supplies (tools/consumables) inventory, a Wishlist
distinct from the shopping list, model tags, stash-value tracking, and an in-app Backups tab
(create/list/download/restore/delete) alongside the automated nightly Docker backup sidecar.
See the root `README.md` for the current feature set.
