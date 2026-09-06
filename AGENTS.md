# Agent notes for Model Workshop Manager

Self-hosted model-kit inventory app: a single React Router v8 (framework
mode) app — React + TypeScript UI and API resource routes in one Node/Express
process → Drizzle ORM → SQLite, behind Docker Compose. Single-user,
LAN/VPN-only by design (see README "Security"). Full feature list and Docker
quick start are in [README.md](README.md) — don't duplicate that here, read
it first.

## Layout

One app, one root `package.json`, one dev server:

- `app/routes/ui.*.tsx` — thin wrappers around the page components in
  `app/pages/` (Dashboard, Models, Paints, Projects, …). No loaders — data
  fetching stays client-side via TanStack Query (`app/api/client.ts`), same
  as before the migration.
- `app/routes/api.*.ts` — API **resource routes** (a `loader` for GET, an
  `action` for POST/PATCH/DELETE/PUT — no UI component). These are a
  near-1:1 port of the old Fastify route handlers; each still returns a
  `Response` directly.
- `app/db/` — Drizzle schema + migrations (unchanged from the old backend).
- `app/lib/*.server.ts`, `app/providers/`, `app/scripts/` — server-only
  helpers. The `.server.ts` suffix is enforced by the React Router Vite
  plugin: importing one from client-reachable code fails the build loudly
  instead of silently leaking server code into the browser bundle.
- `server/app.ts` — the custom Express app: global auth guard, login rate
  limiter, `/uploads` static serving, then the React Router request handler.
  `server.js` is the dev/prod entrypoint (Vite middleware in dev, the built
  server bundle in prod).

```bash
npm install
npm run db:migrate && npm run db:seed   # first time only; db:seed is optional
npm run dev                              # :3000 — one process, UI + API
```

The server refuses to boot without `AUTH_USERNAME`, `AUTH_PASSWORD`, and
`SESSION_SECRET` set (`.env` at repo root, see `.env.example`). `npm run dev`
uses `node --env-file-if-exists=.env`.

**Node 22+ is required** (`.nvmrc`) — `better-sqlite3` needs a matching native
build, and older Node versions fail _silently_ rather than erroring.

## Commands

- Tests: `npm test` (vitest). Coverage: `npm run test:coverage` (adds the
  `@vitest/coverage-v8` provider; writes an HTML report + `coverage-summary.json`
  to `coverage/`, gitignored). CI posts the coverage totals to the workflow
  run's Job Summary and uploads the HTML report as a build artifact.
- Build: `npm run build` (`react-router build` — emits `build/client` and
  `build/server`). Typecheck: `npm run typecheck` (`react-router typegen`
  then `tsc -b`).
- DB schema changes: edit `app/db/schema.ts`, then `npm run db:generate`
  (drizzle-kit) to create a migration under `app/db/migrations/`, then
  `npm run db:migrate` to apply it. Don't hand-edit generated migration SQL
  or the `meta/` snapshots.
- Lint/format is [oxlint](https://oxc.rs/docs/guide/usage/linter) +
  [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html), configured at the
  repo root (`.oxlintrc.json`, `.oxfmtrc.json`): `npm run lint` /
  `npm run lint:fix` / `npm run fmt` / `npm run fmt:check`. A pre-commit hook
  (husky + lint-staged) runs `oxfmt` and `oxlint` on staged files
  automatically. GitHub Actions CI (`.github/workflows/ci.yml`) also runs
  lint, format check, typecheck, build, and tests on every PR.

## Conventions

- **Pluggable providers, not hardcoded integrations.** Any external/optional
  data source follows the `CatalogProvider` pattern in
  [app/providers/types.ts](app/providers/types.ts): a small interface, one
  file per provider, self-reported `enabled` from its own env flag,
  registered in a `Record<string, Provider>` in
  [app/lib/catalogProviders.server.ts](app/lib/catalogProviders.server.ts)
  (see [app/providers/upcItemDbProvider.ts](app/providers/upcItemDbProvider.ts)
  for a worked example). Route handlers should depend only on the interface,
  never a concrete provider. Follow this shape for any new pluggable or
  optional-integration feature, AI-related or not.
- **Request validation**: parse bodies with Zod schemas via `parseBody()` in
  [app/lib/validate.server.ts](app/lib/validate.server.ts), not ad hoc checks.
- **Auth is default-deny.** [server/app.ts](server/app.ts)'s global guard
  covers every `/api/*` and `/uploads/*` request except the explicit
  `PUBLIC_PATHS` allow-list in [app/lib/auth.server.ts](app/lib/auth.server.ts)
  — new API/upload routes are protected automatically. Only add to that set
  deliberately, and only for routes that genuinely must be reachable
  pre-login. (UI routes are not server-gated — `app/root.tsx`'s client-side
  auth check decides whether to render the app or the login screen, same as
  before the migration.)
- **Comments explain _why_, not _what_.** The existing code has no docstrings
  and few comments; the ones present exist to record a non-obvious constraint
  or reason (e.g. why a value is clamped, why an approach was rejected).
  Match that — don't add comments describing what a line of code visibly
  does.

## Things not to "fix"

- **Single-user auth is intentional**, not a missing feature — one
  username/password pair from env vars, no users table. Don't add
  multi-user auth, registration, or a user table unless explicitly asked.
- **No direct manufacturer-site scraping** for catalog data — rate-limit/ToS
  risk. Any such source must stay opt-in and feature-flagged, same as
  `upcItemDbProvider.ts`.
- Photos are stored on disk (`data/uploads/`), never as DB blobs — keep it
  that way.
- **PWA support is temporarily disabled** (`vite-plugin-pwa` conflicts with
  the React Router SSR build — see the comment in `vite.config.ts`). This is
  a known gap, not something to silently work around; re-enabling it is
  tracked as follow-up work, not a bug to fix inline.
