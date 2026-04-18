CREATE TABLE "rate_limit" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_member_invites" ALTER COLUMN "token" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "google_calendar_connections" ALTER COLUMN "access_token" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "google_calendar_connections" ALTER COLUMN "refresh_token" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "quotes" ALTER COLUMN "public_token" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "business_member_invites" ADD COLUMN "token_hash" text;
--> statement-breakpoint
ALTER TABLE "google_calendar_connections" ADD COLUMN "access_token_encrypted" text;
--> statement-breakpoint
ALTER TABLE "google_calendar_connections" ADD COLUMN "refresh_token_encrypted" text;
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "public_token_hash" text;
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "public_token_encrypted" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "business_member_invites_token_hash_unique" ON "business_member_invites" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX "business_member_invites_token_hash_idx" ON "business_member_invites" USING btree ("token_hash");
--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_public_token_hash_unique" ON "quotes" USING btree ("public_token_hash");
