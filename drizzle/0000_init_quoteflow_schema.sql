CREATE TYPE "public"."inquiry_status" AS ENUM('new', 'reviewing', 'quoted', 'booked', 'closed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('draft', 'sent', 'accepted', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."workspace_member_role" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"inquiry_id" text,
	"quote_id" text,
	"actor_user_id" text,
	"type" text NOT NULL,
	"summary" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"status" "inquiry_status" DEFAULT 'new' NOT NULL,
	"subject" text,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text,
	"company_name" text,
	"details" text NOT NULL,
	"source" text,
	"quote_requested" boolean DEFAULT true NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiry_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"inquiry_id" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"storage_path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inquiry_attachments_file_size_nonnegative" CHECK ("inquiry_attachments"."file_size" >= 0)
);
--> statement-breakpoint
CREATE TABLE "inquiry_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"inquiry_id" text NOT NULL,
	"author_user_id" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_faqs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_faqs_position_nonnegative" CHECK ("knowledge_faqs"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "knowledge_files" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"title" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"storage_path" text NOT NULL,
	"extracted_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_files_file_size_nonnegative" CHECK ("knowledge_files"."file_size" >= 0)
);
--> statement-breakpoint
CREATE TABLE "quote_items" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"quote_id" text NOT NULL,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_in_cents" integer DEFAULT 0 NOT NULL,
	"line_total_in_cents" integer DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quote_items_values_valid" CHECK ("quote_items"."quantity" > 0 and "quote_items"."unit_price_in_cents" >= 0 and "quote_items"."line_total_in_cents" >= 0 and "quote_items"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"inquiry_id" text,
	"status" "quote_status" DEFAULT 'draft' NOT NULL,
	"quote_number" text,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"message" text,
	"subtotal_in_cents" integer DEFAULT 0 NOT NULL,
	"tax_in_cents" integer DEFAULT 0 NOT NULL,
	"total_in_cents" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_totals_nonnegative" CHECK ("quotes"."subtotal_in_cents" >= 0 and "quotes"."tax_in_cents" >= 0 and "quotes"."total_in_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"phone" text,
	"job_title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "workspace_member_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"public_inquiry_enabled" boolean DEFAULT true NOT NULL,
	"inquiry_headline" text,
	"default_currency" text DEFAULT 'USD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_attachments" ADD CONSTRAINT "inquiry_attachments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_attachments" ADD CONSTRAINT "inquiry_attachments_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_notes" ADD CONSTRAINT "inquiry_notes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_notes" ADD CONSTRAINT "inquiry_notes_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_notes" ADD CONSTRAINT "inquiry_notes_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_faqs" ADD CONSTRAINT "knowledge_faqs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_files" ADD CONSTRAINT "knowledge_files_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_workspace_id_idx" ON "activity_logs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "activity_logs_workspace_created_at_idx" ON "activity_logs" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_logs_workspace_type_idx" ON "activity_logs" USING btree ("workspace_id","type");--> statement-breakpoint
CREATE INDEX "activity_logs_inquiry_id_idx" ON "activity_logs" USING btree ("inquiry_id");--> statement-breakpoint
CREATE INDEX "activity_logs_quote_id_idx" ON "activity_logs" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "activity_logs_actor_user_id_idx" ON "activity_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_unique" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_unique" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_unique" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "inquiries_workspace_id_idx" ON "inquiries" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "inquiries_workspace_status_idx" ON "inquiries" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "inquiries_workspace_submitted_at_idx" ON "inquiries" USING btree ("workspace_id","submitted_at");--> statement-breakpoint
CREATE INDEX "inquiry_attachments_workspace_id_idx" ON "inquiry_attachments" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "inquiry_attachments_inquiry_id_idx" ON "inquiry_attachments" USING btree ("inquiry_id");--> statement-breakpoint
CREATE INDEX "inquiry_attachments_workspace_inquiry_idx" ON "inquiry_attachments" USING btree ("workspace_id","inquiry_id");--> statement-breakpoint
CREATE INDEX "inquiry_notes_workspace_id_idx" ON "inquiry_notes" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "inquiry_notes_inquiry_id_idx" ON "inquiry_notes" USING btree ("inquiry_id");--> statement-breakpoint
CREATE INDEX "inquiry_notes_workspace_inquiry_idx" ON "inquiry_notes" USING btree ("workspace_id","inquiry_id");--> statement-breakpoint
CREATE INDEX "inquiry_notes_author_user_id_idx" ON "inquiry_notes" USING btree ("author_user_id");--> statement-breakpoint
CREATE INDEX "knowledge_faqs_workspace_id_idx" ON "knowledge_faqs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "knowledge_faqs_workspace_position_idx" ON "knowledge_faqs" USING btree ("workspace_id","position");--> statement-breakpoint
CREATE INDEX "knowledge_files_workspace_id_idx" ON "knowledge_files" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_files_workspace_storage_path_unique" ON "knowledge_files" USING btree ("workspace_id","storage_path");--> statement-breakpoint
CREATE INDEX "quote_items_workspace_id_idx" ON "quote_items" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "quote_items_quote_id_idx" ON "quote_items" USING btree ("quote_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_items_quote_position_unique" ON "quote_items" USING btree ("quote_id","position");--> statement-breakpoint
CREATE INDEX "quotes_workspace_id_idx" ON "quotes" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "quotes_workspace_status_idx" ON "quotes" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "quotes_workspace_created_at_idx" ON "quotes" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "quotes_inquiry_id_idx" ON "quotes" USING btree ("inquiry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_workspace_quote_number_unique" ON "quotes" USING btree ("workspace_id","quote_number");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_members_workspace_user_unique" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workspace_members_workspace_role_idx" ON "workspace_members" USING btree ("workspace_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_slug_unique" ON "workspaces" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "workspaces_created_at_idx" ON "workspaces" USING btree ("created_at");