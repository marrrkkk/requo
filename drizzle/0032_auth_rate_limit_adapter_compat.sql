ALTER TABLE "rate_limit" ADD COLUMN IF NOT EXISTS "id" text;
--> statement-breakpoint
UPDATE "rate_limit"
SET "id" = "key"
WHERE "id" IS NULL;
--> statement-breakpoint
ALTER TABLE "rate_limit" ALTER COLUMN "id" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "rate_limit_id_unique" ON "rate_limit" USING btree ("id");
