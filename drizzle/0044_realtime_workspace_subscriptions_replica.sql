-- Enable REPLICA IDENTITY FULL on workspace_subscriptions so that
-- Supabase Realtime sends the complete row (including `status`) in
-- payload.new for UPDATE events. Without this, only the primary key
-- is included and the checkout dialog's realtime listener cannot
-- detect payment success or expiry.

ALTER TABLE public.workspace_subscriptions REPLICA IDENTITY FULL;
