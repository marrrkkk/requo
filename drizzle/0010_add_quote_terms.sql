-- Add terms field to quotes and default_quote_terms to businesses
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "terms" text;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "default_quote_terms" text;
