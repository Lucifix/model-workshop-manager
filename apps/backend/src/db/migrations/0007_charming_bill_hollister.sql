CREATE TABLE `wishlist_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`paint_id` integer,
	`description` text NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`target_price` real,
	`notes` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`paint_id`) REFERENCES `paints`(`id`) ON UPDATE no action ON DELETE no action
);
