-- Migration: AI Agent V1
-- Add tables for AI agent sessions, messages, and runs.
-- Add configuration columns to businesses table.

-- Create enums for AI agent (guarded: safe to re-run / re-issued in repair migration)
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

-- Create ai_agent_sessions table
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

-- Create ai_agent_messages table
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

-- Create ai_agent_runs table
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

-- Add foreign key constraints
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

-- Create indexes for ai_agent_sessions
CREATE INDEX IF NOT EXISTS "ai_agent_sessions_business_id_idx" ON "ai_agent_sessions" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_agent_sessions_public_token_idx" ON "ai_agent_sessions" USING btree ("public_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_agent_sessions_business_status_idx" ON "ai_agent_sessions" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_agent_sessions_expires_at_idx" ON "ai_agent_sessions" USING btree ("expires_at");--> statement-breakpoint

-- Create indexes for ai_agent_messages
CREATE INDEX IF NOT EXISTS "ai_agent_messages_session_id_idx" ON "ai_agent_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_agent_messages_session_created_idx" ON "ai_agent_messages" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_agent_messages_session_role_idx" ON "ai_agent_messages" USING btree ("session_id","role");--> statement-breakpoint

-- Create indexes for ai_agent_runs
CREATE INDEX IF NOT EXISTS "ai_agent_runs_business_id_idx" ON "ai_agent_runs" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_agent_runs_session_id_idx" ON "ai_agent_runs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_agent_runs_business_started_idx" ON "ai_agent_runs" USING btree ("business_id","started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_agent_runs_status_idx" ON "ai_agent_runs" USING btree ("status");--> statement-breakpoint

-- Add AI agent configuration columns to businesses table
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "ai_agent_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "ai_agent_config" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint

-- Enable RLS on the new tables and add default-deny policies.
-- This follows the established convention from 0007_enable_rls_all_tables.sql:
-- Drizzle uses a direct connection that bypasses RLS, so policies only silence
-- the Supabase linter. Do NOT add business-isolation policies here (they are
-- non-idiomatic for this repo and break on the text-vs-uuid owner id).

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
END $$;
