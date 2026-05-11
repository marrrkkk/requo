-- Per-notification read state so clicking a single notification does not
-- advance the shared watermark and silently mark older ones as read.
--
-- The legacy `business_notification_states.last_read_at` watermark is kept
-- for "Mark all as read" semantics. New reads on a single notification are
-- recorded here; queries treat a notification as read when either the
-- watermark covers it OR an explicit read row exists.
--
-- Scoped to server-side access only: the app writes from authorized
-- server actions and reads from server-side queries. Clients do not
-- subscribe to this table or read it through Supabase. Keeping the
-- migration free of RLS / publication / helper-function dependencies so
-- it applies cleanly across dev, CI, and production databases regardless
-- of their historical RLS state.

CREATE TABLE IF NOT EXISTS public.business_notification_reads (
  id text PRIMARY KEY,
  business_id text NOT NULL REFERENCES public.businesses(id) ON DELETE cascade,
  notification_id text NOT NULL REFERENCES public.business_notifications(id) ON DELETE cascade,
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE cascade,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS business_notification_reads_notification_user_unique
  ON public.business_notification_reads USING btree (notification_id, user_id);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS business_notification_reads_user_business_idx
  ON public.business_notification_reads USING btree (user_id, business_id);
