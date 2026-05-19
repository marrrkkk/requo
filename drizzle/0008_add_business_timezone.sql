-- Add timezone column to businesses table
-- IANA timezone identifier (e.g. "America/New_York"). Defaults to UTC.

ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "timezone" text NOT NULL DEFAULT 'UTC';
