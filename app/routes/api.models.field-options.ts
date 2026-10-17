import { isNotNull } from "drizzle-orm";
import { db } from "../db/client.server";
import { models } from "../db/schema";

type TextColumn = typeof models.scale | typeof models.category | typeof models.difficulty;

function distinct(column: TextColumn): string[] {
  return db
    .selectDistinct({ value: column })
    .from(models)
    .where(isNotNull(column))
    .orderBy(column)
    .all()
    .map((r) => r.value!.trim())
    .filter(Boolean);
}

// Distinct values already used in the catalog, so the add-model form can
// offer "pick one you've used before" instead of making the user retype
// (and inevitably misspell) "Armor" for the fortieth time.
export async function loader() {
  return Response.json({
    scales: distinct(models.scale),
    categories: distinct(models.category),
    difficulties: distinct(models.difficulty),
  });
}
