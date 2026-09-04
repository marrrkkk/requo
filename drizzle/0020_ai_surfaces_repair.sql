-- Migration 0020: AI surfaces repair (custom, idempotent re-issue)
--
-- REPAIR CONTEXT (see docs/specs/ai-agent-and-assistant-remediation.md):
-- The migration runner applies journal entries in order but skips every entry whose
-- `when` timestamp is not greater than the highest `created_at` already recorded in
-- `drizzle.__drizzle_migrations`. Migrations 0016 (when 1756737600000) and 0017
-- (when 1756824000000) regress below 0015 (when 1787100000000), so on any database
-- migrated incrementally through 0015 they were skipped permanently and silently.
-- Databases rebuilt from scratch applied everything (empty history table), which is
-- why the defect went unnoticed.
--
-- This migration re-issues the 0016 + 0017 + 0018 bodies with strictly increasing
-- timestamp so they apply on incrementally-migrated databases and NO-OP on rebuilt
-- ones (every statement is existence-guarded). Do not delete this file: it is the
-- only path by which affected databases receive the AI agent / assistant schema.
--
-- Also carries two additive feature columns required by the remediation spec:
--   - inquiries.escalated (human-handoff flag, inbox filter)
--   - owner_assistant_sessions.title (history sidebar titles)
--
-- INVARIANT GOING FORWARD: journal timestamps must increase monotonically, and a
-- migration must be idempotent unless it is provably applied exactly once.

-- 0016 re-issue: enums (guarded)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_agent_session_status') THEN
    CREATE TYPE "public"."ai_agent_session_status" AS ENUM('active', 'completed', 'human_handoff', 'abandoned');
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_agent_message_role') THEN
    CREATE TYPE "public"."ai_agent_message_role" AS ENUM('user', 'assistant', 'tool', 'system');
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_agent_run_status') THEN
    CREATE TYPE "public"."ai_agent_run_status" AS ENUM('running', 'completed', 'failed');
  END IF;
END $$;--> statement-breakpoint

-- 0016 re-issue: tables (already guarded)
CREATE TABLE IF NOT EXISTS "ai_agent_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"public_token" text NOT NULL,
	"inquiry_id" text,
	"status" "ai_agent_session_status" DEFAULT 'active' NOT NULL,
	"state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "ai_agent_sessions_public_token_unique" UNIQUE("public_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_agent_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"role" "ai_agent_message_role" NOT NULL,
	"content" text NOT NULL,
	"tool_name" text,
	"tool_call_id" text,
	"provider" text,
	"model" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_agent_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"session_id" text NOT NULL,
	"model" text NOT NULL,
	"provider" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost_cents" numeric(10, 4),
	"status" "ai_agent_run_status" DEFAULT 'running' NOT NULL,
	"error" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint

-- 0016 re-issue: foreign keys (already guarded)
DO $$ BEGIN
 ALTER TABLE "ai_agent_sessions" ADD CONSTRAINT "ai_agent_sessions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_agent_sessions" ADD CONSTRAINT "ai_agent_sessions_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_agent_messages" ADD CONSTRAINT "ai_agent_messages_session_id_ai_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_agent_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_agent_runs" ADD CONSTRAINT "ai_agent_runs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_agent_runs" ADD CONSTRAINT "ai_agent_runs_session_id_ai_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_agent_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- 0016 re-issue: indexes (already guarded)
CREATE INDEX IF NOT EXISTS "ai_agent_sessions_business_id_idx" ON "ai_agent_sessions" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_agent_sessions_public_token_idx" ON "ai_agent_sessions" USING btree ("public_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_agent_sessions_business_status_idx" ON "ai_agent_sessions" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_agent_sessions_expires_at_idx" ON "ai_agent_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_agent_messages_session_id_idx" ON "ai_agent_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_agent_messages_session_created_idx" ON "ai_agent_messages" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_agent_messages_session_role_idx" ON "ai_agent_messages" USING btree ("session_id","role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_agent_runs_business_id_idx" ON "ai_agent_runs" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_agent_runs_session_id_idx" ON "ai_agent_runs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_agent_runs_business_started_idx" ON "ai_agent_runs" USING btree ("business_id","started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_agent_runs_status_idx" ON "ai_agent_runs" USING btree ("status");--> statement-breakpoint

-- 0016 re-issue: business columns (already guarded)
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "ai_agent_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "ai_agent_config" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint

-- 0016 re-issue: RLS + deny-all policies (guarded)
ALTER TABLE "ai_agent_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_agent_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_agent_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_agent_sessions' AND policyname = 'ai_agent_sessions_deny_all') THEN
    CREATE POLICY "ai_agent_sessions_deny_all" ON "ai_agent_sessions"
      FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_agent_messages' AND policyname = 'ai_agent_messages_deny_all') THEN
    CREATE POLICY "ai_agent_messages_deny_all" ON "ai_agent_messages"
      FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_agent_runs' AND policyname = 'ai_agent_runs_deny_all') THEN
    CREATE POLICY "ai_agent_runs_deny_all" ON "ai_agent_runs"
      FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;--> statement-breakpoint

-- 0017 re-issue: ai_assisted flag (already guarded; backfill is idempotent)
ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "ai_assisted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "inquiries" SET "ai_assisted" = true WHERE "source" IN ('ai_agent', 'ai_agent_handoff', 'ai');--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inquiries_ai_assisted_idx" ON "inquiries" USING btree ("business_id","ai_assisted","created_at");--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "ai_assistant_beta_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "businesses_ai_assistant_beta_idx" ON "businesses" USING btree ("ai_assistant_beta_enabled");--> statement-breakpoint

-- 0018 re-issue: owner assistant tables (guarded; enum ensured above)
CREATE TABLE IF NOT EXISTS "owner_assistant_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"user_id" text NOT NULL,
	"title" text,
	"state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "owner_assistant_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"role" "ai_agent_message_role" NOT NULL,
	"content" text NOT NULL,
	"tool_name" text,
	"tool_call_id" text,
	"provider" text,
	"model" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "owner_assistant_sessions" ADD CONSTRAINT "owner_assistant_sessions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "owner_assistant_sessions" ADD CONSTRAINT "owner_assistant_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "owner_assistant_messages" ADD CONSTRAINT "owner_assistant_messages_session_id_owner_assistant_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."owner_assistant_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "owner_assistant_sessions_business_id_idx" ON "owner_assistant_sessions" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "owner_assistant_sessions_user_id_idx" ON "owner_assistant_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "owner_assistant_sessions_business_user_idx" ON "owner_assistant_sessions" USING btree ("business_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "owner_assistant_sessions_last_message_idx" ON "owner_assistant_sessions" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "owner_assistant_messages_session_id_idx" ON "owner_assistant_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "owner_assistant_messages_session_created_idx" ON "owner_assistant_messages" USING btree ("session_id","created_at");--> statement-breakpoint
ALTER TABLE "owner_assistant_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "owner_assistant_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'owner_assistant_sessions' AND policyname = 'owner_assistant_sessions_deny_all') THEN
    CREATE POLICY "owner_assistant_sessions_deny_all" ON "owner_assistant_sessions"
      FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'owner_assistant_messages' AND policyname = 'owner_assistant_messages_deny_all') THEN
    CREATE POLICY "owner_assistant_messages_deny_all" ON "owner_assistant_messages"
      FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;--> statement-breakpoint

-- Remediation feature columns (guarded; cover databases that received the
-- tables without these columns, e.g. a manual application of 0017/0018)
ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "escalated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inquiries_escalated_idx" ON "inquiries" USING btree ("business_id","escalated","created_at");--> statement-breakpoint
ALTER TABLE "owner_assistant_sessions" ADD COLUMN IF NOT EXISTS "title" text;--> statement-breakpoint
