import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
};

// ---------------------------------------------------------------------------
// CATALOG DATA — global, shared facts about products. Never contains "I own
// this" or "I built this" information. See docs/ARCHITECTURE.md §6.
// ---------------------------------------------------------------------------

export const manufacturers = sqliteTable("manufacturers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  website: text("website"),
  ...timestamps,
});

/** Paint type enum values (documented, not DB-enforced, to keep SQLite simple) */
export const PAINT_TYPES = [
  "Acrylic",
  "Enamel",
  "Lacquer",
  "Primer",
  "Wash",
  "Panel Liner",
  "Metallic",
  "Weathering",
  "Other",
] as const;

export const paints = sqliteTable("paints", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  manufacturerId: integer("manufacturer_id")
    .notNull()
    .references(() => manufacturers.id),
  productCode: text("product_code").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // one of PAINT_TYPES
  finish: text("finish"), // e.g. Matt, Gloss, Satin
  sizeMl: real("size_ml"),
  colorHex: text("color_hex"),
  colorFamily: text("color_family"),
  notes: text("notes"),
  source: text("source").notNull().default("manual"),
  sourceUrl: text("source_url"),
  importedAt: text("imported_at"), // When this record was imported from external source
  lastSyncedAt: text("last_synced_at"), // Last time this record was synced with external source
  ...timestamps,
});

export const models = sqliteTable("models", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  manufacturerId: integer("manufacturer_id")
    .notNull()
    .references(() => manufacturers.id),
  kitNumber: text("kit_number").notNull(),
  name: text("name").notNull(),
  scale: text("scale"), // e.g. "1:200"
  category: text("category"), // e.g. Ship, Aircraft, Armor, Car
  difficulty: text("difficulty"),
  partCount: integer("part_count"),
  description: text("description"),
  source: text("source").notNull().default("manual"),
  sourceUrl: text("source_url"),
  imageUrl: text("image_url"),
  instructionUrl: text("instruction_url"),
  importedAt: text("imported_at"), // When this record was imported from external source
  lastSyncedAt: text("last_synced_at"), // Last time this record was synced with external source
  ...timestamps,
});

/** Which paints a given model's instructions call for. Still catalog data. */
export const modelPaints = sqliteTable(
  "model_paints",
  {
    modelId: integer("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    paintId: integer("paint_id")
      .notNull()
      .references(() => paints.id),
    usage: text("usage"), // e.g. "Hull", "Deck", "Weathering wash"
    instructionRef: text("instruction_ref"), // e.g. page/step number
    confidence: text("confidence"), // e.g. "official", "community", "guess"
    source: text("source").notNull().default("manual"),
    ...timestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.modelId, t.paintId] }),
  }),
);

// ---------------------------------------------------------------------------
// MY INVENTORY — physical ownership only. No build/progress fields live here.
// ---------------------------------------------------------------------------

export const ownedModels = sqliteTable("owned_models", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  modelId: integer("model_id")
    .notNull()
    .references(() => models.id),
  owned: integer("owned", { mode: "boolean" }).notNull().default(true),
  quantity: integer("quantity").notNull().default(1),
  condition: text("condition"), // e.g. "unbuilt", "built", "damaged"
  storageLocation: text("storage_location"),
  purchaseDate: text("purchase_date"),
  purchasePrice: real("purchase_price"),
  notes: text("notes"),
  ...timestamps,
});

export const FILL_LEVELS = ["Full", "Mostly Full", "Half", "Low", "Empty"] as const;

export const paintInventory = sqliteTable("paint_inventory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  paintId: integer("paint_id")
    .notNull()
    .references(() => paints.id),
  quantity: integer("quantity").notNull().default(1),
  fillLevel: text("fill_level").notNull().default("Full"), // one of FILL_LEVELS
  status: text("status").notNull().default("in_stock"), // in_stock | empty | discontinued
  storageLocation: text("storage_location"),
  notes: text("notes"),
  ...timestamps,
});

/** Generic tools/supplies inventory — brushes, cement, tape, airbrush gear, etc. */
export const supplies = sqliteTable("supplies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category"), // brush | knife | cement | tape | airbrush | other
  quantity: integer("quantity").notNull().default(1),
  condition: text("condition"),
  storageLocation: text("storage_location"),
  notes: text("notes"),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// MY BUILDS — a project always references a catalog model; build state lives
// exclusively here, never on `models`.
// ---------------------------------------------------------------------------

export const PROJECT_STATUSES = [
  "Planned",
  "In Progress",
  "On Hold",
  "Completed",
  "Abandoned",
] as const;

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  modelId: integer("model_id")
    .notNull()
    .references(() => models.id),
  name: text("name").notNull(),
  status: text("status").notNull().default("Planned"), // one of PROJECT_STATUSES
  progressPercent: integer("progress_percent").notNull().default(0),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  notes: text("notes"),
  ...timestamps,
});

export const PAINT_PURPOSES = [
  "required",
  "optional",
  "weathering",
  "already_substituted",
] as const;

export const projectPaints = sqliteTable(
  "project_paints",
  {
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    paintId: integer("paint_id")
      .notNull()
      .references(() => paints.id),
    purpose: text("purpose").notNull().default("required"), // one of PAINT_PURPOSES
    notes: text("notes"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.projectId, t.paintId] }),
  }),
);

export const buildLogEntries = sqliteTable("build_log_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  title: text("title").notNull(),
  description: text("description"),
});

export const projectPhotos = sqliteTable("project_photos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(), // path relative to /data/uploads/projects/{id}/
  originalFilename: text("original_filename"),
  caption: text("caption"),
  takenAt: text("taken_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
});

// ---------------------------------------------------------------------------
// CROSS-CUTTING
// ---------------------------------------------------------------------------

export const shoppingListItems = sqliteTable("shopping_list_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  paintId: integer("paint_id").references(() => paints.id), // nullable: may be a generic supply
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  priority: text("priority").notNull().default("normal"), // low | normal | high
  purchased: integer("purchased", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  purchasedAt: text("purchased_at"),
});
