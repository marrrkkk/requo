-- Owner Assistant Sessions and Messages
-- Persists conversational interactions between business owners/members and the operations assistant
--
-- NOTE: self-sufficient by design (guarded enum creation prepended). This file is
-- registered with a monotonic timestamp *after* the re-issued repair migration
-- also contains these statements, so it must apply cleanly in any order.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_agent_message_role') THEN
    CREATE TYPE "public"."ai_agent_message_role" AS ENUM('user', 'assistant', 'tool', 'system');
  END IF;
END $$;
--> statement-breakpoint
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

-- Enable RLS on the new tables and add default-deny policies.
-- Mirrors 0016_ai_agent_v1.sql: Drizzle uses a direct connection that bypasses
-- RLS, so these policies only silence the Supabase linter. Do NOT add
-- business-isolation policies here (non-idiomatic for this repo).
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
END $$;
