-- Add revision_requested to quote status enum
ALTER TYPE "quote_status" ADD VALUE IF NOT EXISTS 'revision_requested';

-- Add quote_revision_requested to business notification type enum
ALTER TYPE "business_notification_type" ADD VALUE IF NOT EXISTS 'quote_revision_requested';

-- Add version tracking to quotes
ALTER TABLE "quotes" ADD COLUMN "version" integer NOT NULL DEFAULT 1;

-- Quote versions table: stores archived snapshots
CREATE TABLE "quote_versions" (
  "id" text PRIMARY KEY,
  "business_id" text NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "quote_id" text NOT NULL REFERENCES "quotes"("id") ON DELETE CASCADE,
  "version" integer NOT NULL,
  "title" text NOT NULL,
  "customer_name" text NOT NULL,
  "customer_email" text,
  "customer_contact_method" text NOT NULL DEFAULT 'email',
  "customer_contact_handle" text NOT NULL DEFAULT '',
  "currency" text NOT NULL DEFAULT 'USD',
  "notes" text,
  "terms" text,
  "subtotal_in_cents" integer NOT NULL DEFAULT 0,
  "discount_in_cents" integer NOT NULL DEFAULT 0,
  "total_in_cents" integer NOT NULL DEFAULT 0,
  "valid_until" date NOT NULL,
  "items" jsonb NOT NULL DEFAULT '[]',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "archived_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "quote_versions_quote_id_idx" ON "quote_versions"("quote_id");
CREATE INDEX "quote_versions_business_id_idx" ON "quote_versions"("business_id");
CREATE UNIQUE INDEX "quote_versions_quote_version_unique" ON "quote_versions"("quote_id", "version");

-- Quote revision requests table
CREATE TABLE "quote_revision_requests" (
  "id" text PRIMARY KEY,
  "business_id" text NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "quote_id" text NOT NULL REFERENCES "quotes"("id") ON DELETE CASCADE,
  "version" integer NOT NULL,
  "message" text,
  "item_comments" jsonb DEFAULT '[]',
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "resolved_at" timestamp with time zone
);

CREATE INDEX "quote_revision_requests_quote_id_idx" ON "quote_revision_requests"("quote_id");
CREATE INDEX "quote_revision_requests_business_id_idx" ON "quote_revision_requests"("business_id");
