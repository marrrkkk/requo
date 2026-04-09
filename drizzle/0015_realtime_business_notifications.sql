DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'workspaces'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_type
      WHERE typnamespace = 'public'::regnamespace
        AND typname = 'workspace_member_role'
    ) AND NOT EXISTS (
      SELECT 1
      FROM pg_type
      WHERE typnamespace = 'public'::regnamespace
        AND typname = 'business_member_role'
    ) THEN
      ALTER TYPE public.workspace_member_role RENAME TO business_member_role;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_type
      WHERE typnamespace = 'public'::regnamespace
        AND typname = 'workspace_ai_tone_preference'
    ) AND NOT EXISTS (
      SELECT 1
      FROM pg_type
      WHERE typnamespace = 'public'::regnamespace
        AND typname = 'business_ai_tone_preference'
    ) THEN
      ALTER TYPE public.workspace_ai_tone_preference RENAME TO business_ai_tone_preference;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'businesses'
    ) THEN
      ALTER TABLE public.workspaces RENAME TO businesses;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'workspace_members'
    ) AND NOT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'business_members'
    ) THEN
      ALTER TABLE public.workspace_members RENAME TO business_members;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'workspace_inquiry_forms'
    ) AND NOT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'business_inquiry_forms'
    ) THEN
      ALTER TABLE public.workspace_inquiry_forms RENAME TO business_inquiry_forms;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'activity_logs'
        AND column_name = 'workspace_id'
    ) THEN
      ALTER TABLE public.activity_logs RENAME COLUMN workspace_id TO business_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'inquiries'
        AND column_name = 'workspace_id'
    ) THEN
      ALTER TABLE public.inquiries RENAME COLUMN workspace_id TO business_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'inquiries'
        AND column_name = 'workspace_inquiry_form_id'
    ) THEN
      ALTER TABLE public.inquiries RENAME COLUMN workspace_inquiry_form_id TO business_inquiry_form_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'inquiry_attachments'
        AND column_name = 'workspace_id'
    ) THEN
      ALTER TABLE public.inquiry_attachments RENAME COLUMN workspace_id TO business_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'inquiry_notes'
        AND column_name = 'workspace_id'
    ) THEN
      ALTER TABLE public.inquiry_notes RENAME COLUMN workspace_id TO business_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'knowledge_faqs'
        AND column_name = 'workspace_id'
    ) THEN
      ALTER TABLE public.knowledge_faqs RENAME COLUMN workspace_id TO business_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'knowledge_files'
        AND column_name = 'workspace_id'
    ) THEN
      ALTER TABLE public.knowledge_files RENAME COLUMN workspace_id TO business_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'quote_library_entries'
        AND column_name = 'workspace_id'
    ) THEN
      ALTER TABLE public.quote_library_entries RENAME COLUMN workspace_id TO business_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'quote_library_entry_items'
        AND column_name = 'workspace_id'
    ) THEN
      ALTER TABLE public.quote_library_entry_items RENAME COLUMN workspace_id TO business_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'quote_items'
        AND column_name = 'workspace_id'
    ) THEN
      ALTER TABLE public.quote_items RENAME COLUMN workspace_id TO business_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'quotes'
        AND column_name = 'workspace_id'
    ) THEN
      ALTER TABLE public.quotes RENAME COLUMN workspace_id TO business_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'reply_snippets'
        AND column_name = 'workspace_id'
    ) THEN
      ALTER TABLE public.reply_snippets RENAME COLUMN workspace_id TO business_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'business_members'
        AND column_name = 'workspace_id'
    ) THEN
      ALTER TABLE public.business_members RENAME COLUMN workspace_id TO business_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'business_inquiry_forms'
        AND column_name = 'workspace_id'
    ) THEN
      ALTER TABLE public.business_inquiry_forms RENAME COLUMN workspace_id TO business_id;
    END IF;
  END IF;
END
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.is_workspace_member(target_workspace_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members bm
    WHERE bm.business_id = target_workspace_id
      AND bm.user_id = public.current_app_user_id()
  );
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.is_workspace_owner(target_workspace_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members bm
    WHERE bm.business_id = target_workspace_id
      AND bm.user_id = public.current_app_user_id()
      AND bm.role = 'owner'
  );
$$;
--> statement-breakpoint

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS notify_on_quote_response boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS notify_in_app_on_new_inquiry boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS notify_in_app_on_quote_response boolean DEFAULT true NOT NULL;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'business_notification_type'
  ) THEN
    CREATE TYPE public.business_notification_type AS ENUM (
      'public_inquiry_submitted',
      'quote_customer_accepted',
      'quote_customer_rejected'
    );
  END IF;
END
$$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.business_notifications (
  id text PRIMARY KEY,
  business_id text NOT NULL REFERENCES public.businesses(id) ON DELETE cascade,
  inquiry_id text REFERENCES public.inquiries(id) ON DELETE set null,
  quote_id text REFERENCES public.quotes(id) ON DELETE set null,
  type public.business_notification_type NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.business_notification_states (
  id text PRIMARY KEY,
  business_id text NOT NULL REFERENCES public.businesses(id) ON DELETE cascade,
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE cascade,
  last_read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS business_notifications_business_created_at_idx
  ON public.business_notifications USING btree (business_id, created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS business_notifications_business_type_created_at_idx
  ON public.business_notifications USING btree (business_id, type, created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS business_notifications_inquiry_id_idx
  ON public.business_notifications USING btree (inquiry_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS business_notifications_quote_id_idx
  ON public.business_notifications USING btree (quote_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS business_notification_states_business_user_unique
  ON public.business_notification_states USING btree (business_id, user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS business_notification_states_user_business_idx
  ON public.business_notification_states USING btree (user_id, business_id);
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.current_relay_actor_user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(
      COALESCE(
        ((NULLIF(current_setting('request.jwt.claims', true), ''))::jsonb ->> 'sub'),
        ''
      ),
      ''
    ),
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    public.current_app_user_id()
  );
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.is_business_member(target_business_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members bm
    WHERE bm.business_id = target_business_id
      AND bm.user_id = public.current_relay_actor_user_id()
  );
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.is_business_owner(target_business_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members bm
    WHERE bm.business_id = target_business_id
      AND bm.user_id = public.current_relay_actor_user_id()
      AND bm.role = 'owner'
  );
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS business_notifications_set_updated_at ON public.business_notifications;
CREATE TRIGGER business_notifications_set_updated_at
BEFORE UPDATE ON public.business_notifications
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();
--> statement-breakpoint

DROP TRIGGER IF EXISTS business_notification_states_set_updated_at ON public.business_notification_states;
CREATE TRIGGER business_notification_states_set_updated_at
BEFORE UPDATE ON public.business_notification_states
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();
--> statement-breakpoint

ALTER TABLE public.business_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.business_notification_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_notification_states FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

DROP POLICY IF EXISTS business_notifications_select_member ON public.business_notifications;
CREATE POLICY business_notifications_select_member
ON public.business_notifications
FOR SELECT
USING ((SELECT public.is_business_member(business_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS business_notification_states_select_member ON public.business_notification_states;
CREATE POLICY business_notification_states_select_member
ON public.business_notification_states
FOR SELECT
USING (
  (SELECT public.is_business_member(business_id))
  AND user_id = (SELECT public.current_relay_actor_user_id())
);
--> statement-breakpoint

DROP POLICY IF EXISTS business_notification_states_insert_own ON public.business_notification_states;
CREATE POLICY business_notification_states_insert_own
ON public.business_notification_states
FOR INSERT
WITH CHECK (
  (SELECT public.is_business_member(business_id))
  AND user_id = (SELECT public.current_relay_actor_user_id())
);
--> statement-breakpoint

DROP POLICY IF EXISTS business_notification_states_update_own ON public.business_notification_states;
CREATE POLICY business_notification_states_update_own
ON public.business_notification_states
FOR UPDATE
USING (
  (SELECT public.is_business_member(business_id))
  AND user_id = (SELECT public.current_relay_actor_user_id())
)
WITH CHECK (
  (SELECT public.is_business_member(business_id))
  AND user_id = (SELECT public.current_relay_actor_user_id())
);
--> statement-breakpoint

GRANT SELECT ON TABLE public.business_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.business_notification_states TO authenticated;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'business_notifications'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.business_notifications';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'business_notification_states'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.business_notification_states';
    END IF;
  END IF;
END
$$;
