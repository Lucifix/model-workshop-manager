ALTER TABLE paints ADD COLUMN imported_at TEXT;--> statement-breakpoint
ALTER TABLE paints ADD COLUMN last_synced_at TEXT;--> statement-breakpoint
ALTER TABLE models ADD COLUMN imported_at TEXT;--> statement-breakpoint
ALTER TABLE models ADD COLUMN last_synced_at TEXT;
