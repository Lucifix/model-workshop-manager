# Model Workshop Manager

A self-hosted personal app for tracking scale-model kits, paint inventory, and builds.
Runs on your own server via Docker.

See `docs/ARCHITECTURE.md` for the architecture proposal and `docs/DATA_SOURCES.md` for the
research into external catalog/API sources (short version: none of the manufacturers publish a
usable API, so this app is import-first, not fetch-first).

## Architecture

```
Browser (PWA) -> React frontend -> Fastify REST API -> Drizzle ORM -> SQLite
```

Images are stored on the filesystem (`/data/uploads/projects/{id}/...`), never as DB blobs;
SQLite holds only paths and metadata. See `docs/ARCHITECTURE.md` for the full domain model and
the catalog/inventory/build separation this schema enforces.

## Local development

Requires Node.js 20+.

```bash
# Backend
cd apps/backend
npm install
npm run db:generate   # generates SQL migrations from src/db/schema.ts
npm run db:migrate     # applies them to ./data/database/workshop.db
npm run db:seed        # loads the small sample dataset (source='seed-sample')
npm run dev             # starts Fastify on :3001

# Frontend (separate terminal)
cd apps/frontend
npm install
npm run dev             # starts Vite on :5173, proxying /api to :3001
```

Then open http://localhost:5173.

Run backend tests with `npm test` inside `apps/backend` (currently covers the
"required paints vs. owned paints" matching logic in `src/lib/paintAvailability.ts` —
the function called out in the spec as needing thorough testing).

## Docker deployment (Technest / any Linux host)

```bash
cp .env.example .env    # adjust HOST_PORT etc. if needed
docker compose up -d --build
```

This starts two containers:
- `backend` — Fastify API + SQLite, not exposed on the host directly
- `frontend` — Nginx serving the built PWA and reverse-proxying `/api` and `/uploads`
  to `backend`

Visit `http://<technest-host>:8080` (or whatever `HOST_PORT` you set).

**Updating:** `git pull && docker compose up -d --build`

**Stopping:** `docker compose down` (the `workshop-data` volume persists across this)

### Where things live

- Database: named Docker volume `workshop-data`, at `/data/database/workshop.db` inside
  the `backend` container
- Photos: same volume, at `/data/uploads/projects/{projectId}/...`
- Backups: written to `./data/backups` on the host by `scripts/backup.sh`

### First run

After the containers are up, run migrations and (optionally) seed data once:

```bash
docker compose exec backend npm run db:migrate
docker compose exec backend npm run db:seed   # optional, sample data only
```

## Backup & restore

```bash
./scripts/backup.sh
```

Writes a timestamped `.tar.gz` of the database and uploaded photos to `./data/backups`.
Restore steps are documented as comments at the top of `scripts/backup.sh` — in short: stop
the stack, extract the tarball's `database/` and `uploads/` back into the `workshop-data`
volume, restart.

## Data providers / import

There is no automated import from Revell, Tamiya, or AK Interactive — see
`docs/DATA_SOURCES.md` for why. The app instead supports:

1. **Manual entry** — always available, every "Add Model" / "Add Paint" flow has a
   "create manually" path with no dependency on catalog data existing.
2. **CSV/JSON import** — bulk-load rows you've assembled yourself (see the documented
   column shapes in `apps/backend/src/providers/csvImportProvider.ts`). This is the
   intended way to get a large personal catalog in quickly, including data you've
   hand-copied from a reference site like Scalemates.
3. **Barcode lookup (optional)** — `apps/backend/src/providers/upcItemDbProvider.ts`
   wraps UPCitemdb's free-tier API as a quick-fill convenience. Disabled by default;
   set `UPCITEMDB_ENABLED=true` to turn it on. It returns generic retail metadata, not
   hobby-specific fields, so treat it as a starting point to edit, not a source of truth.

### Adding a new catalog provider

Implement the `CatalogProvider` interface in `apps/backend/src/providers/types.ts`:

```ts
interface CatalogProvider {
  id: string;
  label: string;
  searchModels(query: string): Promise<ModelResult[]>;
  getModel(externalId: string): Promise<ModelDetails | null>;
  searchPaints(query: string): Promise<PaintResult[]>;
}
```

Route handlers only ever depend on this interface, so a new provider never requires
touching core app code — register it alongside the existing providers and it slots into
the same "Add Model" / "Add Paint" search flow.

## Security considerations

This is a **single-user private application**, and it requires login:

- The whole API is protected by default (`onRequest` hook, allow-list of exactly three
  public paths: `/api/health`, `/api/auth/login`, `/api/auth/me`) — a new route is
  guarded automatically, nothing to remember to add.
- Credentials are a single username/password pair from `AUTH_USERNAME`/`AUTH_PASSWORD`
  env vars (no user table — this app is explicitly single-user by design, spec §19).
  Compared in constant time to avoid timing attacks.
- Sessions are a signed, `httpOnly` cookie (`@fastify/secure-session`) — no server-side
  session store to run or lose. `SESSION_SECRET` derives the signing key (any string
  works, it's hashed into a proper key internally).
- The login endpoint is rate-limited (5 attempts/minute) against brute-forcing.
- The app **refuses to start** if `AUTH_USERNAME`, `AUTH_PASSWORD`, or `SESSION_SECRET`
  aren't set — see `.env.example`. `docker-compose.yml` also enforces this at deploy
  time (fails immediately with a clear error, rather than crash-looping the container).
- `SESSION_COOKIE_SECURE=true` should be set once this is served over HTTPS — until
  then, leave it `false` or the browser will silently refuse to send the cookie at all.

Still true regardless of login: **don't expose this to the public internet.** Put it
behind your reverse proxy and keep it LAN-only or behind a VPN (Tailscale/WireGuard) —
login raises the bar, it isn't a substitute for not exposing a personal, unaudited app
to the open internet. File uploads are size-capped (25 MB/file) but not otherwise
scanned.

## Project status / phases

Implemented so far (**Phase 1**): monorepo structure, full database schema, Fastify API
covering every resource in the spec, CSV/UPCitemdb/manual provider architecture, seed data,
Docker Compose, and a working PWA frontend shell with a live Dashboard plus Models/Paints/
Projects/Shopping-list list views reading real data.

**Not yet built** (Phases 2–5, tracked in `docs/ARCHITECTURE.md`): create/edit forms and
detail pages in the UI (the API endpoints exist; the forms to drive them don't yet), the
"Add Model"/"Add Paint" search-and-import workflow in the UI, model/project detail pages
showing paint availability visually, build-log/photo-upload UI, shopping-list-from-missing-
paints button, offline-shell testing, and the fuller test suite (API + component tests).
