ALTER TABLE `team` ADD `name` text NOT NULL;--> statement-breakpoint
ALTER TABLE `team` ADD `hidden` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `team` ADD `joinCode` text;--> statement-breakpoint
CREATE UNIQUE INDEX `team_joinCode_unique` ON `team` (`joinCode`);