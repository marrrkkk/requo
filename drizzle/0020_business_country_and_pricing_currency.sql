ALTER TABLE "businesses"
ADD COLUMN "country_code" text;--> statement-breakpoint

ALTER TABLE "quote_library_entries"
ADD COLUMN "currency" text;--> statement-breakpoint

UPDATE "quote_library_entries" AS "entry"
SET "currency" = "business"."default_currency"
FROM "businesses" AS "business"
WHERE "business"."id" = "entry"."business_id"
  AND "entry"."currency" IS NULL;--> statement-breakpoint

ALTER TABLE "quote_library_entries"
ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint

ALTER TABLE "quote_library_entries"
ALTER COLUMN "currency" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "businesses"
ADD CONSTRAINT "businesses_country_code_format"
CHECK ("country_code" IS NULL OR "country_code" ~ '^[A-Z]{2}$');--> statement-breakpoint

ALTER TABLE "quote_library_entries"
ADD CONSTRAINT "quote_library_entries_currency_format"
CHECK ("currency" ~ '^[A-Z]{3}$');--> statement-breakpoint
