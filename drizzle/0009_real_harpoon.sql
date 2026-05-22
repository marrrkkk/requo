CREATE TYPE "public"."follow_up_recurrence" AS ENUM('none', 'daily', 'every_3_days', 'weekly', 'biweekly', 'monthly');--> statement-breakpoint
CREATE TABLE "conversation_summaries" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"summary" text NOT NULL,
	"message_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_summaries_conversation_id_unique" UNIQUE("conversation_id")
);
--> statement-breakpoint
ALTER TABLE "follow_ups" ADD COLUMN "recurrence" "follow_up_recurrence" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD COLUMN "recurrence_limit" integer;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD COLUMN "recurrence_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD COLUMN "parent_follow_up_id" text;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD COLUMN "deleted_by_user_id" text;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD COLUMN "reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "timezone" text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_memories" ADD COLUMN "category" text DEFAULT 'business_rules' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_summaries" ADD CONSTRAINT "conversation_summaries_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_summaries_conversation_id_idx" ON "conversation_summaries" USING btree ("conversation_id");--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_deleted_by_user_id_user_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "follow_ups_not_deleted_idx" ON "follow_ups" USING btree ("business_id","status") WHERE "follow_ups"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "business_memories_business_category_idx" ON "business_memories" USING btree ("business_id","category");--> statement-breakpoint
ALTER TABLE "business_memories" ADD CONSTRAINT "business_memories_category_check" CHECK ("business_memories"."category" IN ('business_rules', 'pricing_knowledge', 'customer_context', 'workflow_preferences'));