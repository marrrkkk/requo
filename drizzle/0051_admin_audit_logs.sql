CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "admin_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "admin_email" text NOT NULL,
  "action" text NOT NULL,
  "target_type" text NOT NULL,
  "target_id" text NOT NULL,
  "metadata" jsonb,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_audit_logs_created_at_idx" ON "admin_audit_logs" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_audit_logs_admin_created_at_idx" ON "admin_audit_logs" USING btree ("admin_user_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_audit_logs_action_created_at_idx" ON "admin_audit_logs" USING btree ("action","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_audit_logs_target_created_at_idx" ON "admin_audit_logs" USING btree ("target_type","target_id","created_at");
