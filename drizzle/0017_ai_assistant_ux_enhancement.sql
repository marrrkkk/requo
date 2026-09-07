-- Migration 0017: AI Assistant UX Enhancement
-- Adds ai_assisted flag to inquiries for attribution tracking.
-- Adds ai_assistant_beta_enabled flag to businesses for gradual rollout.

-- Add ai_assisted flag to inquiries
-- Tracks whether an inquiry was collected (fully or partially) via the AI assistant.
-- Separate from `source` which tracks the submission channel.
ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "ai_assisted" boolean DEFAULT false NOT NULL;--> statement-breakpoint

-- Backfill: mark existing AI-sourced inquiries as ai_assisted
UPDATE "inquiries" SET "ai_assisted" = true WHERE "source" IN ('ai_agent', 'ai_agent_handoff', 'ai');--> statement-breakpoint

-- Index for analytics queries filtering by AI involvement
CREATE INDEX IF NOT EXISTS "inquiries_ai_assisted_idx" ON "inquiries" USING btree ("business_id","ai_assisted","created_at");--> statement-breakpoint

-- Add beta rollout flag to businesses
-- Controls gradual rollout of the new AI Assistant UX (nav, routes, terminology).
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "ai_assistant_beta_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint

-- Partial index for beta-enabled businesses (admin queries, analytics)
CREATE INDEX IF NOT EXISTS "businesses_ai_assistant_beta_idx" ON "businesses" USING btree ("ai_assistant_beta_enabled");--> statement-breakpoint
