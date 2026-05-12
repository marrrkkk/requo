ALTER TABLE "businesses"
  ADD COLUMN IF NOT EXISTS "customer_contact_channel" text;
