import { db } from "./client.js";
import {
  manufacturers,
  paints,
  models,
  modelPaints,
  ownedModels,
  paintInventory,
  projects,
} from "./schema.js";

async function seed() {
  console.log("Seeding sample/development data (source='seed-sample')...");

  const [revell] = await db
    .insert(manufacturers)
    .values({ name: "Revell", slug: "revell", website: "https://revell.com" })
    .returning();
  const [tamiya] = await db
    .insert(manufacturers)
    .values({ name: "Tamiya", slug: "tamiya", website: "https://tamiya.com" })
    .returning();
  const [ak] = await db
    .insert(manufacturers)
    .values({ name: "AK Interactive", slug: "ak-interactive", website: "https://ak-interactive.com" })
    .returning();

  if (!revell || !tamiya || !ak) throw new Error("manufacturer seed failed");

  const [revell05White] = await db
    .insert(paints)
    .values({
      manufacturerId: revell.id,
      productCode: "05",
      name: "Revell 05 White",
      type: "Enamel",
      finish: "Matt",
      sizeMl: 14,
      colorHex: "#F2F2EE",
      colorFamily: "White",
      source: "seed-sample",
    })
    .returning();

  const [revell09Anthracite] = await db
    .insert(paints)
    .values({
      manufacturerId: revell.id,
      productCode: "09",
      name: "Revell 09 Anthracite",
      type: "Enamel",
      finish: "Matt",
      sizeMl: 14,
      colorHex: "#37393B",
      colorFamily: "Grey",
      source: "seed-sample",
    })
    .returning();

  const [revell15Yellow] = await db
    .insert(paints)
    .values({
      manufacturerId: revell.id,
      productCode: "15",
      name: "Revell 15 Yellow",
      type: "Enamel",
      finish: "Matt",
      sizeMl: 14,
      colorHex: "#F2CC0C",
      colorFamily: "Yellow",
      source: "seed-sample",
    })
    .returning();

  await db.insert(paints).values({
    manufacturerId: ak.id,
    productCode: "AK677",
    name: "AK677 Neutral Dark Gray",
    type: "Wash",
    finish: "Matt",
    sizeMl: 35,
    colorFamily: "Grey",
    source: "seed-sample",
  });

  await db.insert(paints).values([
    {
      manufacturerId: tamiya.id,
      productCode: "XF-1",
      name: "XF-1 Flat Black",
      type: "Acrylic",
      finish: "Matt",
      sizeMl: 10,
      colorHex: "#0A0A0A",
      colorFamily: "Black",
      source: "seed-sample",
    },
    {
      manufacturerId: tamiya.id,
      productCode: "X-2",
      name: "X-2 White",
      type: "Acrylic",
      finish: "Gloss",
      sizeMl: 10,
      colorHex: "#F5F5F0",
      colorFamily: "White",
      source: "seed-sample",
    },
  ]);

  const [smitHouston] = await db
    .insert(models)
    .values({
      manufacturerId: revell.id,
      kitNumber: "05239",
      name: "Smit Houston",
      scale: "1:200",
      category: "Ship",
      description: "Ocean-going tug, plastic model kit.",
      source: "seed-sample",
    })
    .returning();

  if (!smitHouston || !revell05White || !revell09Anthracite || !revell15Yellow) {
    throw new Error("model/paint seed failed");
  }

  // Only the requirements explicitly given in the brief's own example are seeded.
  // No additional model-paint pairings are invented (see spec §23).
  await db.insert(modelPaints).values([
    { modelId: smitHouston.id, paintId: revell05White.id, usage: "Hull", confidence: "seed-sample" },
    { modelId: smitHouston.id, paintId: revell09Anthracite.id, usage: "Superstructure", confidence: "seed-sample" },
    { modelId: smitHouston.id, paintId: revell15Yellow.id, usage: "Deck accents", confidence: "seed-sample" },
  ]);

  await db.insert(ownedModels).values({
    modelId: smitHouston.id,
    owned: true,
    condition: "unbuilt",
    notes: "Sample inventory row.",
  });

  await db.insert(paintInventory).values([
    { paintId: revell05White.id, quantity: 1, fillLevel: "Mostly Full" },
    { paintId: revell09Anthracite.id, quantity: 1, fillLevel: "Half" },
  ]);
  // Revell 15 Yellow intentionally NOT in inventory -> demonstrates "missing paint" logic.

  await db.insert(projects).values({
    modelId: smitHouston.id,
    name: "Smit Houston build",
    status: "In Progress",
    progressPercent: 80,
    startedAt: "2026-08-25",
    notes: "Sample project row.",
  });

  console.log("Seed complete.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
