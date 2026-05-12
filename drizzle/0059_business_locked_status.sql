ALTER TABLE "businesses"
  ADD COLUMN IF NOT EXISTS "locked_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "businesses"
  ADD COLUMN IF NOT EXISTS "locked_by" text;
--> statement-breakpoint
ALTER TABLE "businesses"
  ADD COLUMN IF NOT EXISTS "locked_reason" text;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'businesses_locked_by_user_id_fk'
  ) THEN
    ALTER TABLE "businesses"
      ADD CONSTRAINT "businesses_locked_by_user_id_fk"
      FOREIGN KEY ("locked_by") REFERENCES "public"."user"("id")
      ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "businesses_owner_locked_at_idx"
  ON "businesses" USING btree ("owner_user_id","locked_at");
