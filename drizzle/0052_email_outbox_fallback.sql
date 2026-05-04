DO $$ BEGIN
 CREATE TYPE "email_provider" AS ENUM('resend', 'mailtrap', 'brevo');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "email_type" AS ENUM('notification', 'system', 'quote', 'support', 'auth', 'inquiry');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "email_outbox_status" AS ENUM('pending', 'sending', 'sent', 'failed', 'unknown');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "email_attempt_status" AS ENUM('success', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_outbox" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text REFERENCES "workspaces"("id") ON DELETE SET NULL,
  "business_id" text REFERENCES "businesses"("id") ON DELETE SET NULL,
  "user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "type" "email_type" DEFAULT 'notification' NOT NULL,
  "to" jsonb NOT NULL,
  "cc" jsonb,
  "bcc" jsonb,
  "from" text NOT NULL,
  "subject" text NOT NULL,
  "html" text NOT NULL,
  "text" text,
  "status" "email_outbox_status" DEFAULT 'pending' NOT NULL,
  "idempotency_key" text NOT NULL,
  "provider" "email_provider",
  "provider_message_id" text,
  "attempts" integer DEFAULT 0 NOT NULL,
  "last_error" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_attempts" (
  "id" text PRIMARY KEY NOT NULL,
  "email_outbox_id" text NOT NULL REFERENCES "email_outbox"("id") ON DELETE CASCADE,
  "provider" "email_provider" NOT NULL,
  "status" "email_attempt_status" NOT NULL,
  "provider_message_id" text,
  "error_code" text,
  "error_message" text,
  "retryable" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_outbox_idempotency_key_unique" ON "email_outbox" USING btree ("idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_outbox_workspace_created_at_idx" ON "email_outbox" USING btree ("workspace_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_outbox_business_created_at_idx" ON "email_outbox" USING btree ("business_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_outbox_status_created_at_idx" ON "email_outbox" USING btree ("status", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_outbox_provider_message_id_idx" ON "email_outbox" USING btree ("provider", "provider_message_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_attempts_outbox_created_at_idx" ON "email_attempts" USING btree ("email_outbox_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_attempts_provider_created_at_idx" ON "email_attempts" USING btree ("provider", "created_at");
