CREATE INDEX "knowledge_files_workspace_created_at_idx" ON "knowledge_files" USING btree ("workspace_id","created_at");
--> statement-breakpoint

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'knowledge-files',
  'knowledge-files',
  false,
  5242880,
  ARRAY[
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
