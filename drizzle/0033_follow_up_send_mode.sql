CREATE TYPE "public"."follow_up_send_mode" AS ENUM('manual', 'automatic');--> statement-breakpoint
ALTER TABLE "follow_ups" ADD COLUMN "send_mode" "follow_up_send_mode" DEFAULT 'manual' NOT NULL;
