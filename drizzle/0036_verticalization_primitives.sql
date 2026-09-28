CREATE TYPE "public"."approval_state" AS ENUM('pending', 'approved', 'changes_requested', 'superseded', 'expired');--> statement-breakpoint
CREATE TYPE "public"."approval_subject_type" AS ENUM('proof', 'final_count', 'asset', 'milestone', 'hold_confirmation');--> statement-breakpoint
CREATE TYPE "public"."change_order_change" AS ENUM('add', 'modify', 'remove');--> statement-breakpoint
CREATE TYPE "public"."change_order_state" AS ENUM('draft', 'pending_approval', 'approved', 'rejected', 'withdrawn', 'canceled', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."change_order_target_kind" AS ENUM('line', 'block', 'schedule_item');--> statement-breakpoint
CREATE TYPE "public"."pack_recipe_kind" AS ENUM('intake', 'scope', 'approval', 'schedule', 'ai_guidance');--> statement-breakpoint
CREATE TYPE "public"."commercial_schedule_item_category" AS ENUM('deposit', 'milestone', 'balance', 'retainer');--> statement-breakpoint
CREATE TYPE "public"."commercial_schedule_state" AS ENUM('draft', 'scheduled', 'accepted', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."scope_block_kind" AS ENUM('deliverables', 'exclusions', 'assumptions', 'allowances', 'revision_cap', 'acceptance_criteria', 'usage_rights', 'client_responsibilities', 'timeline', 'payment_schedule');--> statement-breakpoint
CREATE TYPE "public"."scope_block_state" AS ENUM('complete', 'incomplete', 'waived');--> statement-breakpoint
ALTER TYPE "public"."analytics_event_type" ADD VALUE 'approval_requested';--> statement-breakpoint
ALTER TYPE "public"."analytics_event_type" ADD VALUE 'approval_viewed';--> statement-breakpoint
ALTER TYPE "public"."analytics_event_type" ADD VALUE 'approval_approved';--> statement-breakpoint
ALTER TYPE "public"."analytics_event_type" ADD VALUE 'approval_changes_requested';--> statement-breakpoint
ALTER TYPE "public"."analytics_event_type" ADD VALUE 'approval_expired';--> statement-breakpoint
ALTER TYPE "public"."analytics_event_type" ADD VALUE 'change_order_created';--> statement-breakpoint
ALTER TYPE "public"."analytics_event_type" ADD VALUE 'change_order_approved';--> statement-breakpoint
ALTER TYPE "public"."analytics_event_type" ADD VALUE 'change_order_rejected';--> statement-breakpoint
ALTER TYPE "public"."analytics_event_type" ADD VALUE 'schedule_created';--> statement-breakpoint
ALTER TYPE "public"."analytics_event_type" ADD VALUE 'schedule_accepted';--> statement-breakpoint
ALTER TYPE "public"."analytics_event_type" ADD VALUE 'schedule_prefill_used';--> statement-breakpoint
ALTER TYPE "public"."analytics_event_type" ADD VALUE 'scope_block_added';--> statement-breakpoint
ALTER TYPE "public"."analytics_event_type" ADD VALUE 'scope_required_missing';--> statement-breakpoint
ALTER TYPE "public"."analytics_event_type" ADD VALUE 'readiness_blocked';--> statement-breakpoint
ALTER TYPE "public"."analytics_event_type" ADD VALUE 'readiness_completed';--> statement-breakpoint
ALTER TYPE "public"."analytics_event_type" ADD VALUE 'ai_pack_guidance_used';--> statement-breakpoint
ALTER TYPE "public"."analytics_event_type" ADD VALUE 'ai_missing_info_detected';--> statement-breakpoint
ALTER TYPE "public"."business_notification_type" ADD VALUE 'approval_requested';--> statement-breakpoint
ALTER TYPE "public"."business_notification_type" ADD VALUE 'approval_approved';--> statement-breakpoint
ALTER TYPE "public"."business_notification_type" ADD VALUE 'approval_changes_requested';--> statement-breakpoint
ALTER TYPE "public"."business_notification_type" ADD VALUE 'approval_expired';--> statement-breakpoint
ALTER TYPE "public"."business_notification_type" ADD VALUE 'change_order_created';--> statement-breakpoint
ALTER TYPE "public"."business_notification_type" ADD VALUE 'change_order_decided';--> statement-breakpoint
CREATE TABLE "approval_artifacts" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"uploader_user_id" text,
	"storage_path" text NOT NULL,
	"content_type" text,
	"size_bytes" integer,
	"artifact_version" integer DEFAULT 1 NOT NULL,
	"sha256" text,
	"superseded_by_artifact_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approval_artifacts_version_positive" CHECK ("approval_artifacts"."artifact_version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "approval_chains" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"subject_type" "approval_subject_type" NOT NULL,
	"quote_id" text,
	"inquiry_id" text,
	"schedule_item_id" text,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approval_chains_subject_exactly_one" CHECK ((
        ("approval_chains"."subject_type" = 'proof' AND (("approval_chains"."quote_id" IS NULL) != ("approval_chains"."inquiry_id" IS NULL)) AND "approval_chains"."schedule_item_id" IS NULL) OR
        ("approval_chains"."subject_type" = 'final_count' AND "approval_chains"."quote_id" IS NOT NULL AND "approval_chains"."inquiry_id" IS NULL AND "approval_chains"."schedule_item_id" IS NULL) OR
        ("approval_chains"."subject_type" = 'asset' AND (("approval_chains"."quote_id" IS NULL) != ("approval_chains"."inquiry_id" IS NULL)) AND "approval_chains"."schedule_item_id" IS NULL) OR
        ("approval_chains"."subject_type" = 'milestone' AND "approval_chains"."schedule_item_id" IS NOT NULL AND "approval_chains"."quote_id" IS NULL AND "approval_chains"."inquiry_id" IS NULL) OR
        ("approval_chains"."subject_type" = 'hold_confirmation' AND (("approval_chains"."quote_id" IS NULL) != ("approval_chains"."inquiry_id" IS NULL)) AND "approval_chains"."schedule_item_id" IS NULL)
      ))
);
--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"chain_id" text NOT NULL,
	"version" integer NOT NULL,
	"supersedes_approval_id" text,
	"artifact_id" text,
	"recipe_kind" text DEFAULT 'approval' NOT NULL,
	"recipe_version" integer DEFAULT 1 NOT NULL,
	"state" "approval_state" DEFAULT 'pending' NOT NULL,
	"requester_user_id" text,
	"approver_name" text,
	"approver_email" text,
	"expires_at" timestamp with time zone,
	"reminder_sent_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"decision_comment" text,
	"snapshot" jsonb NOT NULL,
	"snapshot_hash" text NOT NULL,
	"customer_token" text,
	"customer_token_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approvals_version_positive" CHECK ("approvals"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "change_order_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"change_order_id" text NOT NULL,
	"target_kind" "change_order_target_kind" NOT NULL,
	"target_quote_item_id" text,
	"target_block_id" text,
	"target_schedule_item_id" text,
	"change" "change_order_change" NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"before_snapshot" jsonb,
	"after_snapshot" jsonb,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "change_order_lines_target_exactly_one" CHECK ((
        ("change_order_lines"."target_kind" = 'line' AND "change_order_lines"."target_quote_item_id" IS NOT NULL AND "change_order_lines"."target_block_id" IS NULL AND "change_order_lines"."target_schedule_item_id" IS NULL) OR
        ("change_order_lines"."target_kind" = 'block' AND "change_order_lines"."target_block_id" IS NOT NULL AND "change_order_lines"."target_quote_item_id" IS NULL AND "change_order_lines"."target_schedule_item_id" IS NULL) OR
        ("change_order_lines"."target_kind" = 'schedule_item' AND "change_order_lines"."target_schedule_item_id" IS NOT NULL AND "change_order_lines"."target_quote_item_id" IS NULL AND "change_order_lines"."target_block_id" IS NULL)
      ))
);
--> statement-breakpoint
CREATE TABLE "change_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"quote_id" text NOT NULL,
	"co_number" integer NOT NULL,
	"display_number" text NOT NULL,
	"state" "change_order_state" DEFAULT 'draft' NOT NULL,
	"base_quote_version" integer NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"customer_explanation" text,
	"risk_notes" text,
	"dependencies" text,
	"price_delta_cents" integer DEFAULT 0 NOT NULL,
	"approval_chain_id" text,
	"actor_user_id" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "change_orders_number_positive" CHECK ("change_orders"."co_number" >= 1)
);
--> statement-breakpoint
CREATE TABLE "pack_recipes" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"pack" text NOT NULL,
	"kind" "pack_recipe_kind" NOT NULL,
	"version" integer NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"config" jsonb NOT NULL,
	"effective_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pack_recipes_version_positive" CHECK ("pack_recipes"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "commercial_schedule_items" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"schedule_id" text NOT NULL,
	"position" integer NOT NULL,
	"category" "commercial_schedule_item_category" NOT NULL,
	"label" text NOT NULL,
	"amount_cents" integer,
	"percent_bps" integer,
	"computed_amount_cents" integer NOT NULL,
	"due_date" text,
	"due_condition" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commercial_schedule_items_amount_xor_percent" CHECK (("commercial_schedule_items"."amount_cents" IS NULL) != ("commercial_schedule_items"."percent_bps" IS NULL)),
	CONSTRAINT "commercial_schedule_items_percent_range" CHECK ("commercial_schedule_items"."percent_bps" IS NULL OR ("commercial_schedule_items"."percent_bps" >= 0 AND "commercial_schedule_items"."percent_bps" <= 10000)),
	CONSTRAINT "commercial_schedule_items_computed_non_negative" CHECK ("commercial_schedule_items"."computed_amount_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "commercial_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"quote_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"state" "commercial_schedule_state" DEFAULT 'draft' NOT NULL,
	"quote_total_cents" integer DEFAULT 0 NOT NULL,
	"display_total_cents" integer DEFAULT 0 NOT NULL,
	"recipe_version" integer DEFAULT 1 NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commercial_schedules_version_positive" CHECK ("commercial_schedules"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "quote_scope_blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"quote_id" text NOT NULL,
	"kind" "scope_block_kind" NOT NULL,
	"position" integer NOT NULL,
	"content" jsonb NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"state" "scope_block_state" DEFAULT 'incomplete' NOT NULL,
	"waiver_actor_user_id" text,
	"waived_at" timestamp with time zone,
	"waiver_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quote_scope_blocks_waiver_consistency" CHECK (("quote_scope_blocks"."state" = 'waived' AND "quote_scope_blocks"."waived_at" IS NOT NULL) OR ("quote_scope_blocks"."state" != 'waived'))
);
--> statement-breakpoint
ALTER TABLE "quote_versions" ADD COLUMN "scope_blocks" jsonb;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "notify_in_app_on_approval" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "notify_push_on_approval" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "notify_in_app_on_change_order" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "notify_push_on_change_order" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "approval_artifacts" ADD CONSTRAINT "approval_artifacts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_artifacts" ADD CONSTRAINT "approval_artifacts_uploader_user_id_user_id_fk" FOREIGN KEY ("uploader_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_chains" ADD CONSTRAINT "approval_chains_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_chains" ADD CONSTRAINT "approval_chains_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_chains" ADD CONSTRAINT "approval_chains_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_chains" ADD CONSTRAINT "approval_chains_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_chain_id_approval_chains_id_fk" FOREIGN KEY ("chain_id") REFERENCES "public"."approval_chains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_artifact_id_approval_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."approval_artifacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_requester_user_id_user_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_order_lines" ADD CONSTRAINT "change_order_lines_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_order_lines" ADD CONSTRAINT "change_order_lines_change_order_id_change_orders_id_fk" FOREIGN KEY ("change_order_id") REFERENCES "public"."change_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_approval_chain_id_approval_chains_id_fk" FOREIGN KEY ("approval_chain_id") REFERENCES "public"."approval_chains"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_recipes" ADD CONSTRAINT "pack_recipes_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_schedule_items" ADD CONSTRAINT "commercial_schedule_items_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_schedule_items" ADD CONSTRAINT "commercial_schedule_items_schedule_id_commercial_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."commercial_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_schedules" ADD CONSTRAINT "commercial_schedules_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_schedules" ADD CONSTRAINT "commercial_schedules_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_schedules" ADD CONSTRAINT "commercial_schedules_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_scope_blocks" ADD CONSTRAINT "quote_scope_blocks_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_scope_blocks" ADD CONSTRAINT "quote_scope_blocks_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_scope_blocks" ADD CONSTRAINT "quote_scope_blocks_waiver_actor_user_id_user_id_fk" FOREIGN KEY ("waiver_actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "approval_artifacts_business_idx" ON "approval_artifacts" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "approval_chains_business_idx" ON "approval_chains" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "approval_chains_business_subject_idx" ON "approval_chains" USING btree ("business_id","subject_type");--> statement-breakpoint
CREATE UNIQUE INDEX "approvals_chain_version_unique" ON "approvals" USING btree ("chain_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "approvals_chain_pending_unique" ON "approvals" USING btree ("chain_id") WHERE "approvals"."state" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "approvals_customer_token_hash_unique" ON "approvals" USING btree ("customer_token_hash");--> statement-breakpoint
CREATE INDEX "approvals_business_state_idx" ON "approvals" USING btree ("business_id","state");--> statement-breakpoint
CREATE INDEX "approvals_chain_idx" ON "approvals" USING btree ("chain_id");--> statement-breakpoint
CREATE INDEX "approvals_expiry_idx" ON "approvals" USING btree ("state","expires_at");--> statement-breakpoint
CREATE INDEX "change_order_lines_co_idx" ON "change_order_lines" USING btree ("change_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "change_orders_quote_number_unique" ON "change_orders" USING btree ("quote_id","co_number");--> statement-breakpoint
CREATE UNIQUE INDEX "change_orders_quote_pending_unique" ON "change_orders" USING btree ("quote_id") WHERE "change_orders"."state" = 'pending_approval';--> statement-breakpoint
CREATE INDEX "change_orders_business_quote_idx" ON "change_orders" USING btree ("business_id","quote_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pack_recipes_business_kind_version_unique" ON "pack_recipes" USING btree ("business_id","kind","version");--> statement-breakpoint
CREATE UNIQUE INDEX "pack_recipes_business_kind_active_unique" ON "pack_recipes" USING btree ("business_id","kind") WHERE "pack_recipes"."active" = true;--> statement-breakpoint
CREATE INDEX "pack_recipes_business_kind_idx" ON "pack_recipes" USING btree ("business_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "commercial_schedule_items_schedule_position_unique" ON "commercial_schedule_items" USING btree ("schedule_id","position");--> statement-breakpoint
CREATE INDEX "commercial_schedule_items_schedule_idx" ON "commercial_schedule_items" USING btree ("schedule_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commercial_schedules_quote_version_unique" ON "commercial_schedules" USING btree ("quote_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "commercial_schedules_quote_editable_unique" ON "commercial_schedules" USING btree ("quote_id") WHERE "commercial_schedules"."state" = 'draft' OR "commercial_schedules"."state" = 'scheduled';--> statement-breakpoint
CREATE INDEX "commercial_schedules_business_quote_idx" ON "commercial_schedules" USING btree ("business_id","quote_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_scope_blocks_quote_position_unique" ON "quote_scope_blocks" USING btree ("quote_id","position");--> statement-breakpoint
CREATE INDEX "quote_scope_blocks_business_quote_idx" ON "quote_scope_blocks" USING btree ("business_id","quote_id");--> statement-breakpoint
ALTER TABLE "public"."pack_recipes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."quote_scope_blocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."approval_chains" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."approval_artifacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."approvals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."change_orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."change_order_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."commercial_schedules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."commercial_schedule_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pack_recipes' AND policyname = 'deny_all') THEN
    CREATE POLICY "deny_all" ON "public"."pack_recipes" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_scope_blocks' AND policyname = 'deny_all') THEN
    CREATE POLICY "deny_all" ON "public"."quote_scope_blocks" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'approval_chains' AND policyname = 'deny_all') THEN
    CREATE POLICY "deny_all" ON "public"."approval_chains" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'approval_artifacts' AND policyname = 'deny_all') THEN
    CREATE POLICY "deny_all" ON "public"."approval_artifacts" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'approvals' AND policyname = 'deny_all') THEN
    CREATE POLICY "deny_all" ON "public"."approvals" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'change_orders' AND policyname = 'deny_all') THEN
    CREATE POLICY "deny_all" ON "public"."change_orders" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'change_order_lines' AND policyname = 'deny_all') THEN
    CREATE POLICY "deny_all" ON "public"."change_order_lines" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'commercial_schedules' AND policyname = 'deny_all') THEN
    CREATE POLICY "deny_all" ON "public"."commercial_schedules" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'commercial_schedule_items' AND policyname = 'deny_all') THEN
    CREATE POLICY "deny_all" ON "public"."commercial_schedule_items" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;
