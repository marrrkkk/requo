-- Rename tax_in_cents to discount_in_cents for correct semantics
-- The column was named "tax_in_cents" but actually stores discount amounts
-- This was causing confusion between discount and tax fields

-- Drop the old constraint first (it references the old column name)
ALTER TABLE "quotes" DROP CONSTRAINT IF EXISTS "quotes_totals_valid";

-- Rename the column
ALTER TABLE "quotes" RENAME COLUMN "tax_in_cents" TO "discount_in_cents";

-- Add the corrected constraint with proper column names
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_totals_valid" CHECK (
  "quotes"."subtotal_in_cents" >= 0
  and "quotes"."discount_in_cents" >= 0
  and "quotes"."tax_amount_in_cents" >= 0
  and "quotes"."total_in_cents" >= 0
  and "quotes"."subtotal_in_cents" >= "quotes"."discount_in_cents"
  and "quotes"."total_in_cents" = "quotes"."subtotal_in_cents" - "quotes"."discount_in_cents" + "quotes"."tax_amount_in_cents"
);
