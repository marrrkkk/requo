CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"business_id" text,
	"actor_user_id" text,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"action" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source" text DEFAULT 'app' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "audit_logs_workspace_created_at_idx" ON "audit_logs" USING btree ("workspace_id","created_at");
--> statement-breakpoint
CREATE INDEX "audit_logs_workspace_actor_created_at_idx" ON "audit_logs" USING btree ("workspace_id","actor_user_id","created_at");
--> statement-breakpoint
CREATE INDEX "audit_logs_workspace_entity_created_at_idx" ON "audit_logs" USING btree ("workspace_id","entity_type","created_at");
--> statement-breakpoint
CREATE INDEX "audit_logs_workspace_action_created_at_idx" ON "audit_logs" USING btree ("workspace_id","action","created_at");
--> statement-breakpoint
CREATE INDEX "audit_logs_workspace_business_created_at_idx" ON "audit_logs" USING btree ("workspace_id","business_id","created_at");
