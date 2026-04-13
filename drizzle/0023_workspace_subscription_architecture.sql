-- Migration: Workspace-based subscription architecture
-- Moves plan/subscription from businesses to workspaces.
-- Each existing user's businesses are grouped under a single workspace
-- using the highest plan among their owned businesses.

-- 1. Create workspace_member_role enum
DO $$ BEGIN
  CREATE TYPE "workspace_member_role" AS ENUM ('owner', 'admin', 'member');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Create workspaces table
CREATE TABLE IF NOT EXISTS "workspaces" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "plan" text NOT NULL DEFAULT 'free',
  "owner_user_id" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "workspaces_slug_format" CHECK ("slug" ~ '^[a-z0-9-]+$'),
  CONSTRAINT "workspaces_plan_valid" CHECK ("plan" in ('free', 'pro', 'business'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_slug_unique" ON "workspaces" ("slug");
CREATE INDEX IF NOT EXISTS "workspaces_owner_user_id_idx" ON "workspaces" ("owner_user_id");

-- 3. Create workspace_members table
CREATE TABLE IF NOT EXISTS "workspace_members" (
  "id" text PRIMARY KEY,
  "workspace_id" text NOT NULL REFERENCES "workspaces" ("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "role" "workspace_member_role" NOT NULL DEFAULT 'member',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_members_workspace_user_unique" ON "workspace_members" ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "workspace_members_user_id_idx" ON "workspace_members" ("user_id");
CREATE INDEX IF NOT EXISTS "workspace_members_workspace_id_idx" ON "workspace_members" ("workspace_id");

-- 4. Add workspace_id to businesses (nullable first for migration)
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "workspace_id" text REFERENCES "workspaces" ("id") ON DELETE CASCADE;

-- 5. Migrate existing data: group each user's businesses into one workspace
-- Uses the highest plan from owned businesses for the workspace plan.
DO $$
DECLARE
  _owner_record RECORD;
  _ws_id text;
  _ws_slug text;
  _ws_name text;
  _best_plan text;
  _owner_name text;
  _slug_candidate text;
  _slug_counter int;
BEGIN
  -- For each distinct user who owns at least one business
  FOR _owner_record IN
    SELECT DISTINCT bm."user_id"
    FROM "business_members" bm
    WHERE bm."role" = 'owner'
      AND NOT EXISTS (
        SELECT 1 FROM "workspace_members" wm WHERE wm."user_id" = bm."user_id"
      )
  LOOP
    -- Determine the best plan from all businesses this user owns
    SELECT
      CASE
        WHEN bool_or(b."plan" = 'business') THEN 'business'
        WHEN bool_or(b."plan" = 'pro') THEN 'pro'
        ELSE 'free'
      END
    INTO _best_plan
    FROM "business_members" bm2
    JOIN "businesses" b ON bm2."business_id" = b."id"
    WHERE bm2."user_id" = _owner_record."user_id"
      AND bm2."role" = 'owner';

    -- Get the owner's name for workspace naming
    SELECT u."name" INTO _owner_name
    FROM "user" u
    WHERE u."id" = _owner_record."user_id";

    _ws_name := coalesce(_owner_name, 'My') || '''s Workspace';
    _slug_candidate := lower(regexp_replace(coalesce(_owner_name, 'workspace'), '[^a-z0-9]+', '-', 'gi'));
    _slug_candidate := trim(both '-' from _slug_candidate);
    IF _slug_candidate = '' THEN _slug_candidate := 'workspace'; END IF;
    _slug_candidate := _slug_candidate || '-ws';

    -- Ensure slug uniqueness
    _ws_slug := _slug_candidate;
    _slug_counter := 0;
    WHILE EXISTS (SELECT 1 FROM "workspaces" WHERE "slug" = _ws_slug) LOOP
      _slug_counter := _slug_counter + 1;
      _ws_slug := _slug_candidate || '-' || _slug_counter;
    END LOOP;

    _ws_id := 'ws_' || replace(gen_random_uuid()::text, '-', '');

    -- Create the workspace
    INSERT INTO "workspaces" ("id", "name", "slug", "plan", "owner_user_id", "created_at", "updated_at")
    VALUES (_ws_id, _ws_name, _ws_slug, _best_plan, _owner_record."user_id", now(), now());

    -- Create workspace membership for the owner
    INSERT INTO "workspace_members" ("id", "workspace_id", "user_id", "role", "created_at", "updated_at")
    VALUES ('wm_' || replace(gen_random_uuid()::text, '-', ''), _ws_id, _owner_record."user_id", 'owner', now(), now());

    -- Link all businesses this user owns to this workspace
    UPDATE "businesses" b
    SET "workspace_id" = _ws_id
    FROM "business_members" bm
    WHERE bm."business_id" = b."id"
      AND bm."user_id" = _owner_record."user_id"
      AND bm."role" = 'owner'
      AND b."workspace_id" IS NULL;

    -- Also create workspace memberships for non-owner business members
    INSERT INTO "workspace_members" ("id", "workspace_id", "user_id", "role", "created_at", "updated_at")
    SELECT
      'wm_' || replace(gen_random_uuid()::text, '-', ''),
      _ws_id,
      bm3."user_id",
      'member',
      now(),
      now()
    FROM "business_members" bm3
    JOIN "businesses" b3 ON bm3."business_id" = b3."id"
    WHERE b3."workspace_id" = _ws_id
      AND bm3."user_id" != _owner_record."user_id"
      AND NOT EXISTS (
        SELECT 1 FROM "workspace_members" wm2
        WHERE wm2."workspace_id" = _ws_id AND wm2."user_id" = bm3."user_id"
      );
  END LOOP;

  -- Handle orphaned businesses (no owner member) — create a workspace per business
  FOR _owner_record IN
    SELECT b."id" AS business_id, b."plan" AS business_plan, b."name" AS business_name, b."slug" AS business_slug
    FROM "businesses" b
    WHERE b."workspace_id" IS NULL
  LOOP
    _ws_id := 'ws_' || replace(gen_random_uuid()::text, '-', '');
    _ws_slug := _owner_record.business_slug || '-ws';

    _slug_counter := 0;
    WHILE EXISTS (SELECT 1 FROM "workspaces" WHERE "slug" = _ws_slug) LOOP
      _slug_counter := _slug_counter + 1;
      _ws_slug := _owner_record.business_slug || '-ws-' || _slug_counter;
    END LOOP;

    -- Pick a fallback owner from business_members
    SELECT bm."user_id" INTO _owner_name
    FROM "business_members" bm
    WHERE bm."business_id" = _owner_record.business_id
    ORDER BY bm."created_at" ASC
    LIMIT 1;

    IF _owner_name IS NOT NULL THEN
      INSERT INTO "workspaces" ("id", "name", "slug", "plan", "owner_user_id", "created_at", "updated_at")
      VALUES (_ws_id, _owner_record.business_name || '''s Workspace', _ws_slug, coalesce(_owner_record.business_plan, 'free'), _owner_name, now(), now());

      INSERT INTO "workspace_members" ("id", "workspace_id", "user_id", "role", "created_at", "updated_at")
      VALUES ('wm_' || replace(gen_random_uuid()::text, '-', ''), _ws_id, _owner_name, 'owner', now(), now())
      ON CONFLICT DO NOTHING;

      UPDATE "businesses" SET "workspace_id" = _ws_id WHERE "id" = _owner_record.business_id;
    END IF;
  END LOOP;
END $$;

-- 6. Make workspace_id NOT NULL now that all existing rows have been migrated
ALTER TABLE "businesses" ALTER COLUMN "workspace_id" SET NOT NULL;

-- 7. Create index on workspace_id
CREATE INDEX IF NOT EXISTS "businesses_workspace_id_idx" ON "businesses" ("workspace_id");

-- 8. Drop plan column and check constraint from businesses
ALTER TABLE "businesses" DROP CONSTRAINT IF EXISTS "businesses_plan_valid";
ALTER TABLE "businesses" DROP COLUMN IF EXISTS "plan";
