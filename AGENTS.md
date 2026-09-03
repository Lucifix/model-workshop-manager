# Agent notes for Model Workshop Manager

Self-hosted model-kit inventory app: React + TypeScript PWA → Fastify REST API
→ Drizzle ORM → SQLite, behind Docker Compose. Single-user, LAN/VPN-only by
design (see README "Security"). Full feature list and Docker quick start are
in [README.md](README.md) — don't duplicate that here, read it first.

## Layout

Two independent apps, no root `package.json` / workspace — install and run
each separately:

- `apps/backend` — Fastify API, Drizzle + SQLite, port 3001.
- `apps/frontend` — Vite + React PWA, port 5173, proxies `/api` to the backend
  in dev.

```bash
# Backend
cd apps/backend && npm install
npm run db:migrate && npm run db:seed   # first time only; db:seed is optional
npm run dev                              # :3001

# Frontend (separate terminal)
cd apps/frontend && npm install
npm run dev                              # :5173
```

Backend refuses to boot without `AUTH_USERNAME`, `AUTH_PASSWORD`, and
`SESSION_SECRET` set (`.env` in `apps/backend`, see `.env.example` at repo
root). `npm run dev` uses `tsx --env-file=.env`.

**Node 22+ is required** (`.nvmrc`) — `better-sqlite3` needs a matching native
build, and older Node versions fail *silently* rather than erroring.

## Commands

- Backend tests: `cd apps/backend && npm test` (vitest). Frontend has no test
  setup.
- Backend build: `cd apps/backend && npm run build` (tsc). Frontend build:
  `cd apps/frontend && npm run build` (tsc -b && vite build).
- DB schema changes: edit `apps/backend/src/db/schema.ts`, then
  `npm run db:generate` (drizzle-kit) to create a migration under
  `src/db/migrations/`, then `npm run db:migrate` to apply it. Don't hand-edit
  generated migration SQL or the `meta/` snapshots.
- Lint/format is [oxlint](https://oxc.rs/docs/guide/usage/linter) +
  [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html), configured at the
  repo root (`.oxlintrc.json`, `.oxfmtrc.json`) and covering both apps. Run
  from the repo root (there's a tooling-only root `package.json` for this —
  it holds no app dependencies and isn't a workspace):
  `npm run lint` / `npm run lint:fix` / `npm run fmt` / `npm run fmt:check`.
  **There is no CI in this repo** — these aren't enforced automatically.

## Conventions

- **Pluggable providers, not hardcoded integrations.** Any external/optional
  data source follows the `CatalogProvider` pattern in
  [apps/backend/src/providers/types.ts](apps/backend/src/providers/types.ts):
  a small interface, one file per provider, self-reported `enabled` from its
  own env flag, registered in a `Record<string, Provider>` in the route file
  (see [apps/backend/src/routes/catalog.ts](apps/backend/src/routes/catalog.ts)
  and [apps/backend/src/providers/upcItemDbProvider.ts](apps/backend/src/providers/upcItemDbProvider.ts)
  for a worked example). Route handlers should depend only on the interface,
  never a concrete provider. Follow this shape for any new pluggable or
  optional-integration feature, AI-related or not.
- **Request validation**: parse bodies with Zod schemas via `parseBody()` in
  [apps/backend/src/lib/validate.ts](apps/backend/src/lib/validate.ts), not
  ad hoc checks.
- **Auth is default-deny.** [apps/backend/src/lib/auth.ts](apps/backend/src/lib/auth.ts)
  guards the whole API except an explicit `PUBLIC_PATHS` allow-list — new
  routes are protected automatically. Only add to that set deliberately, and
  only for routes that genuinely must be reachable pre-login.
- **Comments explain *why*, not *what*.** The existing code has no docstrings
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
- Photos are stored on disk (`apps/backend/data/uploads/`), never as DB
  blobs — keep it that way.
