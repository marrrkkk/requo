CREATE TYPE "public"."workspace_ai_tone_preference" AS ENUM('balanced', 'warm', 'direct', 'formal');--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "short_description" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "logo_storage_path" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "logo_content_type" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "default_email_signature" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "default_quote_notes" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "ai_tone_preference" "workspace_ai_tone_preference" DEFAULT 'balanced' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "notify_on_new_inquiry" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "notify_on_quote_sent" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_slug_format" CHECK ("workspaces"."slug" ~ '^[a-z0-9-]+$');--> statement-breakpoint

UPDATE "workspaces" AS "w"
SET "contact_email" = "u"."email"
FROM "workspace_members" AS "wm"
INNER JOIN "user" AS "u" ON "wm"."user_id" = "u"."id"
WHERE "wm"."workspace_id" = "w"."id"
  AND "wm"."role" = 'owner'
  AND "w"."contact_email" IS NULL;--> statement-breakpoint

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'workspace-assets',
  'workspace-assets',
  false,
  2097152,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
