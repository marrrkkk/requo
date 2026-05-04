-- Post-Win Workflow: expand post-acceptance lifecycle, add checklist, follow-up category

-- 1. Expand the post-acceptance status enum with fulfillment states
ALTER TYPE quote_post_acceptance_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE quote_post_acceptance_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE quote_post_acceptance_status ADD VALUE IF NOT EXISTS 'canceled';

-- 2. Add post-win lifecycle fields to quotes
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS completed_by text REFERENCES "user"(id) ON DELETE SET NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS canceled_at timestamptz;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS canceled_by text REFERENCES "user"(id) ON DELETE SET NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS cancellation_reason text;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS cancellation_note text;

-- 3. Add follow-up category (sales vs post_win)
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'sales';

-- 4. Create post-win checklist table
CREATE TABLE IF NOT EXISTS post_win_checklist_items (
  id text PRIMARY KEY,
  business_id text NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  quote_id text NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  label text NOT NULL,
  completed_at timestamptz,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS post_win_checklist_items_business_id_idx ON post_win_checklist_items(business_id);
CREATE INDEX IF NOT EXISTS post_win_checklist_items_quote_id_idx ON post_win_checklist_items(quote_id);
CREATE UNIQUE INDEX IF NOT EXISTS post_win_checklist_items_quote_position_unique ON post_win_checklist_items(quote_id, position);

-- 5. Index for accepted-needing-next-step dashboard query
CREATE INDEX IF NOT EXISTS quotes_accepted_post_win_idx ON quotes(business_id, post_acceptance_status)
  WHERE status = 'accepted' AND deleted_at IS NULL AND archived_at IS NULL;
