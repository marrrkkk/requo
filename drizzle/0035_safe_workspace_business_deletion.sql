ALTER TABLE "businesses" ADD COLUMN "archived_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "archived_by" text;
--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "deleted_by" text;
--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "scheduled_deletion_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "scheduled_deletion_by" text;
--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "deleted_by" text;
--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_archived_by_user_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_scheduled_deletion_by_user_id_fk" FOREIGN KEY ("scheduled_deletion_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspaces" DROP CONSTRAINT "workspaces_owner_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "businesses_workspace_archived_at_idx" ON "businesses" USING btree ("workspace_id","archived_at");
--> statement-breakpoint
CREATE INDEX "businesses_workspace_deleted_at_idx" ON "businesses" USING btree ("workspace_id","deleted_at");
--> statement-breakpoint
CREATE INDEX "workspaces_scheduled_deletion_at_idx" ON "workspaces" USING btree ("scheduled_deletion_at");
--> statement-breakpoint
CREATE INDEX "workspaces_deleted_at_idx" ON "workspaces" USING btree ("deleted_at");
--> statement-breakpoint
CREATE INDEX "workspaces_owner_deleted_at_idx" ON "workspaces" USING btree ("owner_user_id","deleted_at");
