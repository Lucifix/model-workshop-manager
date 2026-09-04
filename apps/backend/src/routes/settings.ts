import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { appSettings } from "../db/schema.js";
import { settingsUpdateSchema } from "../lib/schemas.js";
import { parseBody } from "../lib/validate.js";

// Single-row table (id 1) — this is a single-user app, so app-wide config
// doesn't need a real settings key or a user to hang off of.
const SETTINGS_ID = 1;

function getOrCreateSettings() {
  const row = db.select().from(appSettings).where(eq(appSettings.id, SETTINGS_ID)).get();
  if (row) {
    return row;
  }
  return db.insert(appSettings).values({ id: SETTINGS_ID }).returning().get();
}

export async function settingsRoutes(app: FastifyInstance) {
  app.get("/api/settings", async () => getOrCreateSettings());

  app.put("/api/settings", async (req, reply) => {
    const body = parseBody(settingsUpdateSchema, req.body, reply);
    if (!body) {
      return;
    }
    getOrCreateSettings();
    const [row] = await db
      .update(appSettings)
      .set(body)
      .where(eq(appSettings.id, SETTINGS_ID))
      .returning();
    return row;
  });
}
