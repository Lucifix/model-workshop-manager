-- Migration: Add provenance tracking fields to paints and models
-- This allows tracking when records were imported and last synced with external sources

-- Add imported_at and last_synced_at columns to paints
ALTER TABLE paints ADD COLUMN imported_at TEXT;
ALTER TABLE paints ADD COLUMN last_synced_at TEXT;

-- Add imported_at and last_synced_at columns to models
ALTER TABLE models ADD COLUMN imported_at TEXT;
ALTER TABLE models ADD COLUMN last_synced_at TEXT;

-- Update the _journal to mark this migration
INSERT INTO "_drizzle_migrations" (hash, created_at) VALUES (
  '0001_add_provenance_tracking',
  datetime('now')
);
