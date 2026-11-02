CREATE TABLE `auth_identities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`provider` enum('email','google','manus') NOT NULL,
	`provider_subject` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auth_identities_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_identities_provider_subject_unique` UNIQUE(`provider`,`provider_subject`)
);
--> statement-breakpoint
CREATE TABLE `exercise_targets` (
	`exercise_id` int NOT NULL,
	`sub_muscle_id` int NOT NULL,
	`role` enum('primary','secondary') NOT NULL,
	CONSTRAINT `exercise_targets_exercise_id_sub_muscle_id_pk` PRIMARY KEY(`exercise_id`,`sub_muscle_id`)
);
--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(140) NOT NULL,
	`name_ar` varchar(220) NOT NULL,
	`name_en` varchar(220) NOT NULL,
	`equipment` enum('machine','dumbbell','barbell','cable','bodyweight') NOT NULL,
	`level` enum('beginner','intermediate') NOT NULL,
	`description_ar` text NOT NULL,
	`description_en` text NOT NULL,
	`steps_ar` text NOT NULL,
	`steps_en` text NOT NULL,
	`mistakes_ar` text NOT NULL,
	`mistakes_en` text NOT NULL,
	`media_url` varchar(1024),
	`media_type` enum('video','gif','lottie','image','svg') DEFAULT 'image',
	`poster_url` varchar(1024),
	`status` enum('draft','published') NOT NULL DEFAULT 'published',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exercises_id` PRIMARY KEY(`id`),
	CONSTRAINT `exercises_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `muscles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(80) NOT NULL,
	`name_ar` varchar(180) NOT NULL,
	`name_en` varchar(180) NOT NULL,
	`view` enum('front','back','both') NOT NULL DEFAULT 'both',
	`position` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `muscles_id` PRIMARY KEY(`id`),
	CONSTRAINT `muscles_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `oauth_states` (
	`state_hash` varchar(64) NOT NULL,
	`redirect_uri` varchar(1024) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `oauth_states_state_hash` PRIMARY KEY(`state_hash`)
);
--> statement-breakpoint
CREATE TABLE `password_credentials` (
	`user_id` int NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`changed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_credentials_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`bucket` varchar(120) NOT NULL,
	`hits` int NOT NULL DEFAULT 0,
	`window_start` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rate_limits_bucket` PRIMARY KEY(`bucket`)
);
--> statement-breakpoint
CREATE TABLE `schedule_days` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schedule_id` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`position` int NOT NULL,
	`split_day_id` int,
	CONSTRAINT `schedule_days_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedule_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`day_id` int NOT NULL,
	`exercise_id` int NOT NULL,
	`sets` int NOT NULL DEFAULT 3,
	`reps` varchar(24) NOT NULL DEFAULT '8–12',
	`rest_seconds` int NOT NULL DEFAULT 90,
	`position` int NOT NULL,
	CONSTRAINT `schedule_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`split_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_texts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`text_key` varchar(160) NOT NULL,
	`locale` enum('ar','en') NOT NULL,
	`value` text NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_texts_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_texts_key_locale_unique` UNIQUE(`text_key`,`locale`)
);
--> statement-breakpoint
CREATE TABLE `split_day_muscles` (
	`split_day_id` int NOT NULL,
	`muscle_id` int NOT NULL,
	CONSTRAINT `split_day_muscles_split_day_id_muscle_id_pk` PRIMARY KEY(`split_day_id`,`muscle_id`)
);
--> statement-breakpoint
CREATE TABLE `split_days` (
	`id` int AUTO_INCREMENT NOT NULL,
	`split_id` int NOT NULL,
	`name_ar` varchar(160) NOT NULL,
	`name_en` varchar(160) NOT NULL,
	`position` int NOT NULL,
	CONSTRAINT `split_days_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `splits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_user_id` int,
	`slug` varchar(120) NOT NULL,
	`name_ar` varchar(200) NOT NULL,
	`name_en` varchar(200) NOT NULL,
	`days_count` int NOT NULL,
	`description_ar` text NOT NULL,
	`description_en` text NOT NULL,
	`level` enum('beginner','intermediate') NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `splits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sub_muscles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`muscle_id` int NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name_ar` varchar(180) NOT NULL,
	`name_en` varchar(180) NOT NULL,
	`svg_path_id` varchar(120),
	`position` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sub_muscles_id` PRIMARY KEY(`id`),
	CONSTRAINT `sub_muscles_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`last_seen_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_sessions_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `email_normalized` varchar(320);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_normalized_unique` UNIQUE(`email_normalized`);--> statement-breakpoint
ALTER TABLE `auth_identities` ADD CONSTRAINT `auth_identities_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exercise_targets` ADD CONSTRAINT `exercise_targets_exercise_id_exercises_id_fk` FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exercise_targets` ADD CONSTRAINT `exercise_targets_sub_muscle_id_sub_muscles_id_fk` FOREIGN KEY (`sub_muscle_id`) REFERENCES `sub_muscles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `password_credentials` ADD CONSTRAINT `password_credentials_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `schedule_days` ADD CONSTRAINT `schedule_days_schedule_id_schedules_id_fk` FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `schedule_days` ADD CONSTRAINT `schedule_days_split_day_id_split_days_id_fk` FOREIGN KEY (`split_day_id`) REFERENCES `split_days`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `schedule_items` ADD CONSTRAINT `schedule_items_day_id_schedule_days_id_fk` FOREIGN KEY (`day_id`) REFERENCES `schedule_days`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `schedule_items` ADD CONSTRAINT `schedule_items_exercise_id_exercises_id_fk` FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `schedules` ADD CONSTRAINT `schedules_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `schedules` ADD CONSTRAINT `schedules_split_id_splits_id_fk` FOREIGN KEY (`split_id`) REFERENCES `splits`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `split_day_muscles` ADD CONSTRAINT `split_day_muscles_split_day_id_split_days_id_fk` FOREIGN KEY (`split_day_id`) REFERENCES `split_days`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `split_day_muscles` ADD CONSTRAINT `split_day_muscles_muscle_id_muscles_id_fk` FOREIGN KEY (`muscle_id`) REFERENCES `muscles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `split_days` ADD CONSTRAINT `split_days_split_id_splits_id_fk` FOREIGN KEY (`split_id`) REFERENCES `splits`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `splits` ADD CONSTRAINT `splits_owner_user_id_users_id_fk` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sub_muscles` ADD CONSTRAINT `sub_muscles_muscle_id_muscles_id_fk` FOREIGN KEY (`muscle_id`) REFERENCES `muscles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `auth_identities_user_idx` ON `auth_identities` (`user_id`);--> statement-breakpoint
CREATE INDEX `exercise_targets_sub_idx` ON `exercise_targets` (`sub_muscle_id`,`role`);--> statement-breakpoint
CREATE INDEX `exercises_status_idx` ON `exercises` (`status`);--> statement-breakpoint
CREATE INDEX `schedule_days_schedule_idx` ON `schedule_days` (`schedule_id`);--> statement-breakpoint
CREATE INDEX `schedule_items_day_idx` ON `schedule_items` (`day_id`);--> statement-breakpoint
CREATE INDEX `schedules_user_idx` ON `schedules` (`user_id`);--> statement-breakpoint
CREATE INDEX `split_day_muscles_muscle_idx` ON `split_day_muscles` (`muscle_id`);--> statement-breakpoint
CREATE INDEX `split_days_split_idx` ON `split_days` (`split_id`);--> statement-breakpoint
CREATE INDEX `splits_owner_idx` ON `splits` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `splits_slug_owner_idx` ON `splits` (`slug`,`owner_user_id`);--> statement-breakpoint
CREATE INDEX `sub_muscles_muscle_idx` ON `sub_muscles` (`muscle_id`);--> statement-breakpoint
CREATE INDEX `user_sessions_user_idx` ON `user_sessions` (`user_id`);