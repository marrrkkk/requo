-- Migration: Rename pricing library to product library
-- Renames AI quote fields from aiPricing* to aiProduct* terminology

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_pricing_status') THEN
    ALTER TYPE "ai_pricing_status" RENAME TO "ai_product_status";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quote_items' AND column_name = 'ai_pricing_status'
  ) THEN
    ALTER TABLE "quote_items" RENAME COLUMN "ai_pricing_status" TO "ai_product_status";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quote_items' AND column_name = 'ai_pricing_library_entry_id'
  ) THEN
    ALTER TABLE "quote_items" RENAME COLUMN "ai_pricing_library_entry_id" TO "ai_product_library_entry_id";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quote_items' AND column_name = 'ai_pricing_library_item_id'
  ) THEN
    ALTER TABLE "quote_items" RENAME COLUMN "ai_pricing_library_item_id" TO "ai_product_library_item_id";
  END IF;
END $$;
