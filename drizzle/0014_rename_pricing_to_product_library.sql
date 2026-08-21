-- Migration: Rename pricing library to product library
-- Renames AI quote fields from aiPricing* to aiProduct* terminology

-- Rename enum type from ai_pricing_status to ai_product_status
ALTER TYPE "ai_pricing_status" RENAME TO "ai_product_status";

-- Rename columns in quote_items table
ALTER TABLE "quote_items" RENAME COLUMN "ai_pricing_status" TO "ai_product_status";
ALTER TABLE "quote_items" RENAME COLUMN "ai_pricing_library_entry_id" TO "ai_product_library_entry_id";
ALTER TABLE "quote_items" RENAME COLUMN "ai_pricing_library_item_id" TO "ai_product_library_item_id";
