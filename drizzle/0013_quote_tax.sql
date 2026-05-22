-- Add tax columns to quotes table
ALTER TABLE "quotes" ADD COLUMN "tax_amount_in_cents" integer NOT NULL DEFAULT 0;
ALTER TABLE "quotes" ADD COLUMN "tax_label" text;

-- Add tax columns to quote_versions table
ALTER TABLE "quote_versions" ADD COLUMN "tax_amount_in_cents" integer NOT NULL DEFAULT 0;
ALTER TABLE "quote_versions" ADD COLUMN "tax_label" text;

-- Update the totals check constraint: total = subtotal - discount + tax
ALTER TABLE "quotes" DROP CONSTRAINT IF EXISTS "quotes_totals_valid";
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_totals_valid"
  CHECK (
    subtotal_in_cents >= 0
    AND tax_in_cents >= 0
    AND tax_amount_in_cents >= 0
    AND total_in_cents >= 0
    AND subtotal_in_cents >= tax_in_cents
    AND total_in_cents = subtotal_in_cents - tax_in_cents + tax_amount_in_cents
  );
