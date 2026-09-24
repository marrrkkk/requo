INSERT INTO "storage"."buckets" ("id", "name", "public") VALUES
  ('business-assets', 'business-assets', false),
  ('inquiry-attachments', 'inquiry-attachments', false),
  ('knowledge-files', 'knowledge-files', false),
  ('profile-assets', 'profile-assets', false)
ON CONFLICT ("id") DO NOTHING;
