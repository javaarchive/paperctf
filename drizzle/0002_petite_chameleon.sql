CREATE TABLE `team` (
	`id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE `user` ADD `teamId` text;