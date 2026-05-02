-- Repair Supabase Realtime access for client-side flows.
-- Required realtime tables:
-- - workspace_subscriptions: checkout subscription INSERT/UPDATE
-- - payment_attempts: checkout payment attempt INSERT/UPDATE
-- - business_notifications: owner notification INSERT
-- - business_notification_states: notification read-state INSERT/UPDATE
-- - inquiries: inquiry list refresh on INSERT
--
-- Dashboard clients use Better Auth JWTs, so RLS must read the JWT `sub`
-- claim instead of only the app DB session setting.

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

ALTER TABLE public.business_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.business_notification_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_notification_states FORCE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

DROP POLICY IF EXISTS workspace_subscriptions_select_member ON public.workspace_subscriptions;
CREATE POLICY workspace_subscriptions_select_member
ON public.workspace_subscriptions
FOR SELECT
USING ((SELECT public.is_realtime_workspace_member(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS payment_attempts_select_member ON public.payment_attempts;
CREATE POLICY payment_attempts_select_member
ON public.payment_attempts
FOR SELECT
USING ((SELECT public.is_realtime_workspace_member(workspace_id)));
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

DROP POLICY IF EXISTS inquiries_select_realtime_member ON public.inquiries;
CREATE POLICY inquiries_select_realtime_member
ON public.inquiries
FOR SELECT
USING ((SELECT public.is_business_member(business_id)));
--> statement-breakpoint

GRANT SELECT ON TABLE public.business_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.business_notification_states TO authenticated;
GRANT SELECT ON TABLE public.inquiries TO authenticated;
GRANT SELECT ON TABLE public.workspace_subscriptions TO authenticated;
GRANT SELECT ON TABLE public.payment_attempts TO authenticated;
--> statement-breakpoint

ALTER TABLE public.workspace_subscriptions REPLICA IDENTITY FULL;
ALTER TABLE public.payment_attempts REPLICA IDENTITY FULL;
ALTER TABLE public.business_notification_states REPLICA IDENTITY FULL;
--> statement-breakpoint

DO $$
DECLARE
  realtime_table text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    FOREACH realtime_table IN ARRAY ARRAY[
      'workspace_subscriptions',
      'payment_attempts',
      'business_notifications',
      'business_notification_states',
      'inquiries'
    ]
    LOOP
      IF to_regclass('public.' || realtime_table) IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM pg_publication_tables
          WHERE pubname = 'supabase_realtime'
            AND schemaname = 'public'
            AND tablename = realtime_table
        ) THEN
        EXECUTE format(
          'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
          realtime_table
        );
      END IF;
    END LOOP;
  END IF;
END
$$;
