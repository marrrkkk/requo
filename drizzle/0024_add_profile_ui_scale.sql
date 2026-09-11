CREATE TYPE "public"."profile_ui_scale" AS ENUM('small', 'default', 'large');--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "ui_scale" "profile_ui_scale" DEFAULT 'default' NOT NULL;
