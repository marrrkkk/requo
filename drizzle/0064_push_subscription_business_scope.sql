-- Scope browser push subscriptions by business so one browser can receive
-- notifications for multiple businesses owned or managed by the same user.

DROP INDEX IF EXISTS public.push_subscriptions_user_endpoint_unique;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_user_business_endpoint_unique
  ON public.push_subscriptions USING btree (user_id, business_id, endpoint);
