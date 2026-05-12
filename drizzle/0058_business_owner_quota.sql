ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "owner_user_id" text;
--> statement-breakpoint
WITH business_owners AS (
  SELECT
    b.id AS business_id,
    COALESCE(
      (
        SELECT bm.user_id
        FROM "business_members" AS bm
        WHERE bm.business_id = b.id
          AND bm.role = 'owner'
        ORDER BY bm.created_at ASC, bm.id ASC
        LIMIT 1
      ),
      w.owner_user_id
    ) AS owner_user_id
  FROM "businesses" AS b
  INNER JOIN "workspaces" AS w ON b.workspace_id = w.id
  WHERE b.owner_user_id IS NULL
)
UPDATE "businesses" AS b
SET "owner_user_id" = business_owners.owner_user_id
FROM business_owners
WHERE b.id = business_owners.business_id;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'businesses_owner_user_id_user_id_fk'
  ) THEN
    ALTER TABLE "businesses"
      ADD CONSTRAINT "businesses_owner_user_id_user_id_fk"
      FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id")
      ON DELETE restrict ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "businesses" ALTER COLUMN "owner_user_id" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "businesses_owner_deleted_at_idx"
  ON "businesses" USING btree ("owner_user_id","deleted_at");
