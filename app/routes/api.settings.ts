import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { appSettings } from "../db/schema";
import { settingsUpdateSchema } from "../lib/schemas";
import { parseBody } from "../lib/validate.server";

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

export async function loader() {
  return Response.json(getOrCreateSettings());
}

export async function action({ request }: { request: Request }) {
  const body = parseBody(settingsUpdateSchema, await request.json());
  getOrCreateSettings();
  const [row] = await db
    .update(appSettings)
    .set(body)
    .where(eq(appSettings.id, SETTINGS_ID))
    .returning();
  return Response.json(row);
}
