import { eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { tags, modelTags } from "../db/schema";

/** Find-or-create each tag by name and link it to the model. Used by both
 * create and update — update replaces the full tag set. */
export async function attachTags(modelId: number, names: string[]) {
  for (const rawName of names) {
    const name = rawName.trim();
    if (!name) {
      continue;
    }
    let tag = db.select().from(tags).where(eq(tags.name, name)).get();
    if (!tag) {
      // oxlint-disable-next-line no-await-in-loop
      const [created] = await db.insert(tags).values({ name }).returning();
      tag = created;
    }
    // oxlint-disable-next-line no-await-in-loop
    await db.insert(modelTags).values({ modelId, tagId: tag!.id }).returning();
  }
}
