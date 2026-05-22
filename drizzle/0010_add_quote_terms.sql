-- Add terms field to quotes and default_quote_terms to businesses
ALTER TABLE "quotes" ADD COLUMN "terms" text;
ALTER TABLE "businesses" ADD COLUMN "default_quote_terms" text;
