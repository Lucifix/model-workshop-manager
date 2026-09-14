CREATE TABLE `auth_credential` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_changed_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
