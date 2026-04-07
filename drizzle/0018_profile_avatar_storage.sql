ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "avatar_storage_path" text;--> statement-breakpoint
ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "avatar_content_type" text;--> statement-breakpoint

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'profile-assets',
  'profile-assets',
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
