CREATE TYPE "public"."quote_post_acceptance_status" AS ENUM('none', 'booked', 'scheduled');--> statement-breakpoint
CREATE TABLE "reply_snippets" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "post_acceptance_status" "quote_post_acceptance_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "reply_snippets" ADD CONSTRAINT "reply_snippets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reply_snippets_workspace_id_idx" ON "reply_snippets" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "reply_snippets_workspace_created_at_idx" ON "reply_snippets" USING btree ("workspace_id","created_at");