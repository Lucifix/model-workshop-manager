CREATE TABLE `catalog_lookup_cache` (
	`provider` text NOT NULL,
	`query_key` text NOT NULL,
	`response` text NOT NULL,
	`fetched_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	PRIMARY KEY(`provider`, `query_key`)
);
--> statement-breakpoint
ALTER TABLE `models` ADD `barcode` text;--> statement-breakpoint
CREATE INDEX `models_barcode_idx` ON `models` (`barcode`);