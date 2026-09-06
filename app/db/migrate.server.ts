import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./client.server";

// Resolved relative to the process's cwd (the repo/app root in both dev and
// the production Docker image), not import.meta.dirname — the server build
// bundles everything under server/app.ts into one file, so a dirname-relative
// path would resolve inside build/server/ where the (non-JS) migration SQL
// files were never bundled. The Dockerfile copies app/db/migrations to this
// same cwd-relative path in the runtime image.
const migrationsFolder = process.env.MIGRATIONS_DIR ?? "./app/db/migrations";

export function runMigrations() {
  migrate(db, { migrationsFolder });
}

// CLI entrypoint: `npm run db:migrate`
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
  console.log("Migrations applied.");
}
