-- Enable RLS on workspace_subscriptions for Supabase Realtime
-- This allows the checkout dialog to listen for real-time status changes
-- triggered by PayMongo webhooks (payment success, expiry, failure).

-- Ensure prerequisite helper functions exist (idempotent)
CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '');
$$;
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

-- Helper: check if the JWT user is a member of the given workspace
CREATE OR REPLACE FUNCTION public.is_realtime_workspace_member(target_workspace_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = target_workspace_id
      AND wm.user_id = public.current_relay_actor_user_id()
  );
$$;
--> statement-breakpoint

ALTER TABLE public.workspace_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_subscriptions FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

DROP POLICY IF EXISTS workspace_subscriptions_select_member ON public.workspace_subscriptions;
CREATE POLICY workspace_subscriptions_select_member
ON public.workspace_subscriptions
FOR SELECT
USING ((SELECT public.is_realtime_workspace_member(workspace_id)));
--> statement-breakpoint

GRANT SELECT ON TABLE public.workspace_subscriptions TO authenticated;
--> statement-breakpoint

-- Add workspace_subscriptions to Supabase Realtime publication
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
        AND tablename = 'workspace_subscriptions'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_subscriptions';
    END IF;
  END IF;
END
$$;
