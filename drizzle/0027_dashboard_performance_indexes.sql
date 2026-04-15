CREATE INDEX IF NOT EXISTS "quotes_sent_valid_until_idx"
ON "quotes" ("business_id", "expires_at")
WHERE "status" = 'sent';--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "quotes_sent_follow_up_idx"
ON "quotes" ("business_id", "sent_at")
WHERE "status" = 'sent' AND "customer_responded_at" IS NULL;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "inquiries_open_deadline_idx"
ON "inquiries" ("business_id", "requested_deadline")
WHERE "status" IN ('new', 'waiting', 'quoted') AND "requested_deadline" IS NOT NULL;
