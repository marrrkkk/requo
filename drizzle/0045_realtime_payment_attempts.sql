-- Enable RLS and Supabase Realtime access on payment_attempts so
-- the checkout dialog can observe webhook-driven payment failures.

ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

DROP POLICY IF EXISTS payment_attempts_select_member ON public.payment_attempts;
CREATE POLICY payment_attempts_select_member
ON public.payment_attempts
FOR SELECT
USING ((SELECT public.is_realtime_workspace_member(workspace_id)));
--> statement-breakpoint

GRANT SELECT ON TABLE public.payment_attempts TO authenticated;
--> statement-breakpoint

ALTER TABLE public.payment_attempts REPLICA IDENTITY FULL;
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
        AND tablename = 'payment_attempts'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_attempts';
    END IF;
  END IF;
END
$$;
