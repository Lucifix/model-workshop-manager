-- Migration: Add an optional logo_url field to manufacturers.
-- Populated manually per-brand (pasted URL or personal upload), never by bulk
-- automated download of third-party trademarked artwork. See docs/PLAN.md §36.

ALTER TABLE manufacturers ADD COLUMN logo_url TEXT;
