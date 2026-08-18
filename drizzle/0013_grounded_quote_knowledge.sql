CREATE TYPE "public"."knowledge_file_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ai_pricing_status" AS ENUM('verified', 'suggested', 'unpriced', 'owner_set');--> statement-breakpoint
CREATE TYPE "public"."ai_quote_readiness" AS ENUM('ready', 'needs_confirmation', 'scope_only');--> statement-breakpoint
CREATE TABLE "business_knowledge_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"file_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"content" text NOT NULL,
	"content_hash" text NOT NULL,
	"embedding" jsonb DEFAULT 'null'::jsonb,
	"token_estimate" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_chunks_position_nonnegative" CHECK ("business_knowledge_chunks"."position" >= 0),
	CONSTRAINT "knowledge_chunks_token_estimate_nonnegative" CHECK ("business_knowledge_chunks"."token_estimate" >= 0)
);
--> statement-breakpoint
CREATE TABLE "business_knowledge_files" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"original_file_name" text NOT NULL,
	"storage_path" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer DEFAULT 0 NOT NULL,
	"status" "knowledge_file_status" DEFAULT 'pending' NOT NULL,
	"extracted_character_count" integer,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_files_byte_size_nonnegative" CHECK ("business_knowledge_files"."byte_size" >= 0),
	CONSTRAINT "knowledge_files_extracted_chars_nonnegative" CHECK ("business_knowledge_files"."extracted_character_count" is null or "business_knowledge_files"."extracted_character_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "business_memories" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"category" text DEFAULT 'business_rules' NOT NULL,
	"embedding" jsonb DEFAULT 'null'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_memories_position_nonnegative" CHECK ("business_memories"."position" >= 0),
	CONSTRAINT "business_memories_title_length" CHECK (char_length("business_memories"."title") <= 200),
	CONSTRAINT "business_memories_content_length" CHECK (char_length("business_memories"."content") <= 4000),
	CONSTRAINT "business_memories_category_check" CHECK ("business_memories"."category" in ('business_rules', 'pricing_knowledge', 'customer_context', 'workflow_preferences'))
);
--> statement-breakpoint
ALTER TABLE "quote_items" ADD COLUMN "ai_pricing_status" "ai_pricing_status";--> statement-breakpoint
ALTER TABLE "quote_items" ADD COLUMN "ai_pricing_library_entry_id" text;--> statement-breakpoint
ALTER TABLE "quote_items" ADD COLUMN "ai_pricing_library_item_id" text;--> statement-breakpoint
ALTER TABLE "quote_items" ADD COLUMN "ai_evidence" jsonb DEFAULT 'null'::jsonb;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "ai_readiness" "ai_quote_readiness";--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "ai_missing_info" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "ai_acknowledged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "ai_acknowledged_by" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "ai_generation_id" text;--> statement-breakpoint
ALTER TABLE "business_knowledge_chunks" ADD CONSTRAINT "business_knowledge_chunks_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_knowledge_chunks" ADD CONSTRAINT "business_knowledge_chunks_file_id_business_knowledge_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."business_knowledge_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_knowledge_files" ADD CONSTRAINT "business_knowledge_files_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_memories" ADD CONSTRAINT "business_memories_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knowledge_chunks_business_file_position_idx" ON "business_knowledge_chunks" USING btree ("business_id","file_id","position");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_business_content_hash_idx" ON "business_knowledge_chunks" USING btree ("business_id","content_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_chunks_file_position_unique" ON "business_knowledge_chunks" USING btree ("file_id","position");--> statement-breakpoint
CREATE INDEX "knowledge_files_business_status_idx" ON "business_knowledge_files" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "knowledge_files_business_created_at_idx" ON "business_knowledge_files" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_files_storage_path_unique" ON "business_knowledge_files" USING btree ("storage_path");--> statement-breakpoint
CREATE INDEX "business_memories_business_id_idx" ON "business_memories" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "business_memories_business_position_idx" ON "business_memories" USING btree ("business_id","position");--> statement-breakpoint
CREATE INDEX "business_memories_business_category_idx" ON "business_memories" USING btree ("business_id","category");--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_ai_acknowledged_by_user_id_fk" FOREIGN KEY ("ai_acknowledged_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;