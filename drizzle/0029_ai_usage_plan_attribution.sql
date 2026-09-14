-- Plan attribution for AI usage events.
--
-- Monthly AI credit usage is summed per (business, plan) so a mid-month plan
-- change starts a fresh allowance for the new plan rather than carrying the
-- previous plan's accumulated total against it.
--
-- `plan` is intentionally nullable: rows written before this migration have no
-- plan and are counted toward whichever plan is current (`plan = current OR
-- plan IS NULL`), so no business loses already-accumulated allowance on deploy.
-- Every statement is existence-guarded so this migration is safe to re-run.
ALTER TABLE "ai_usage_events" ADD COLUMN IF NOT EXISTS "plan" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_usage_events_business_plan_month_idx" ON "ai_usage_events" USING btree ("business_id","plan","created_at");
