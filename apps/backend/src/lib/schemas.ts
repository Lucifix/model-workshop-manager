import { z } from "zod";
import {
  PAINT_TYPES,
  FILL_LEVELS,
  PROJECT_STATUSES,
  PAINT_PURPOSES,
  SUPPLY_CATEGORIES,
  CURRENCIES,
} from "../db/schema.js";

export const manufacturerCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  website: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
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
  sourceUrl: z.string().url().optional(),
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
  sourceUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  instructionUrl: z.string().url().optional(),
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
export const paintInventoryUpdateSchema = paintInventoryCreateSchema.partial();

export const projectCreateSchema = z.object({
  modelId: z.number().int().positive(),
  name: z.string().min(1),
  status: z.enum(PROJECT_STATUSES).default("Planned"),
  progressPercent: z.number().int().min(0).max(100).default(0),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  notes: z.string().optional(),
});
export const projectUpdateSchema = projectCreateSchema.partial().extend({
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

export const supplyCreateSchema = z.object({
  name: z.string().min(1),
  category: z.enum(SUPPLY_CATEGORIES).optional(),
  quantity: z.number().int().nonnegative().default(1),
  condition: z.string().optional(),
  storageLocation: z.string().optional(),
  purchasePrice: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});
export const supplyUpdateSchema = supplyCreateSchema.partial();

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
export const wishlistUpdateSchema = wishlistCreateSchema.partial();

export const settingsUpdateSchema = z.object({
  currency: z.enum(CURRENCIES),
});
