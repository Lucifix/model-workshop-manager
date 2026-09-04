CREATE TABLE `app_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
