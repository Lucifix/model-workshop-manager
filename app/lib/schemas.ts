import { z } from "zod";
import {
  PAINT_TYPES,
  FILL_LEVELS,
  PROJECT_STATUSES,
  PAINT_PURPOSES,
  SUPPLY_CATEGORIES,
  CURRENCIES,
} from "../db/schema.js";

// z.string().url() accepts any scheme, including javascript:/data:/file: —
// these values later render as href/src, so use zod's http(s)-only variant.
// Exported as a plain predicate for the import routes, which validate rows
// field-by-field rather than through a schema.
export function isHttpUrl(value: string): boolean {
  return z.httpUrl().safeParse(value).success;
}

type WithoutDefaults<S extends z.ZodRawShape> = {
  [K in keyof S]: S[K] extends z.ZodDefault<infer Inner> ? Inner : S[K];
};

// Zod 4 still applies a field's .default() inside .partial(), so an update
// schema derived straight from a create schema fills every omitted field with
// its create-time default — a PATCH of just { progressPercent } would also
// reset status to "Planned" (issue #14). Strip the defaults first so a PATCH
// only touches the fields it actually sends.
function partialWithoutDefaults<S extends z.ZodRawShape>(schema: z.ZodObject<S>) {
  const shape = Object.fromEntries(
    Object.entries(schema.shape).map(([key, field]) => [
      key,
      field instanceof z.ZodDefault ? field.unwrap() : field,
    ]),
  ) as WithoutDefaults<S>;
  return z.object(shape).partial();
}

export const manufacturerCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  website: z.httpUrl().optional(),
  logoUrl: z.httpUrl().optional(),
});

export const paintCreateSchema = z.object({
  manufacturerId: z.number().int().positive(),
  productCode: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(PAINT_TYPES),
  finish: z.string().optional(),
  sizeMl: z.number().positive().optional(),
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  colorFamily: z.string().optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
  sourceUrl: z.httpUrl().optional(),
});
export const paintUpdateSchema = paintCreateSchema.partial();

export const modelCreateSchema = z.object({
  manufacturerId: z.number().int().positive(),
  kitNumber: z.string().min(1),
  name: z.string().min(1),
  scale: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.string().optional(),
  partCount: z.number().int().positive().optional(),
  description: z.string().optional(),
  source: z.string().optional(),
  sourceUrl: z.httpUrl().optional(),
  imageUrl: z.httpUrl().optional(),
  instructionUrl: z.httpUrl().optional(),
  tagNames: z.array(z.string().min(1)).optional(),
});
export const modelUpdateSchema = modelCreateSchema.partial();

export const tagCreateSchema = z.object({
  name: z.string().min(1),
});

export const modelPaintCreateSchema = z.object({
  paintId: z.number().int().positive(),
  usage: z.string().optional(),
  instructionRef: z.string().optional(),
  confidence: z.string().optional(),
});

export const ownedModelCreateSchema = z.object({
  modelId: z.number().int().positive(),
  owned: z.boolean().default(true),
  quantity: z.number().int().positive().default(1),
  condition: z.string().optional(),
  storageLocation: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export const paintInventoryCreateSchema = z.object({
  paintId: z.number().int().positive(),
  quantity: z.number().int().nonnegative().default(1),
  fillLevel: z.enum(FILL_LEVELS).default("Full"),
  status: z.string().optional(),
  storageLocation: z.string().optional(),
  purchasePrice: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});
export const paintInventoryUpdateSchema = partialWithoutDefaults(paintInventoryCreateSchema);

export const projectCreateSchema = z.object({
  modelId: z.number().int().positive(),
  name: z.string().min(1),
  status: z.enum(PROJECT_STATUSES).default("Planned"),
  progressPercent: z.number().int().min(0).max(100).default(0),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  notes: z.string().optional(),
});
export const projectUpdateSchema = partialWithoutDefaults(projectCreateSchema).extend({
  coverPhotoId: z.number().int().positive().nullable().optional(),
});

export const projectPaintCreateSchema = z.object({
  paintId: z.number().int().positive(),
  purpose: z.enum(PAINT_PURPOSES).default("required"),
  notes: z.string().optional(),
});

export const buildLogCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});
export const buildLogUpdateSchema = buildLogCreateSchema.partial();

export const supplyCreateSchema = z.object({
  name: z.string().min(1),
  category: z.enum(SUPPLY_CATEGORIES).optional(),
  quantity: z.number().int().nonnegative().default(1),
  condition: z.string().optional(),
  storageLocation: z.string().optional(),
  purchasePrice: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});
export const supplyUpdateSchema = partialWithoutDefaults(supplyCreateSchema);

export const shoppingListCreateSchema = z.object({
  paintId: z.number().int().positive().optional(),
  description: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
});

export const wishlistCreateSchema = z.object({
  paintId: z.number().int().positive().optional(),
  description: z.string().min(1),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  targetPrice: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});
export const wishlistUpdateSchema = partialWithoutDefaults(wishlistCreateSchema);

export const settingsSchema = z.object({
  currency: z.enum(CURRENCIES),
  upcItemDbEnabled: z.boolean(),
});
export const settingsUpdateSchema = settingsSchema.partial();
