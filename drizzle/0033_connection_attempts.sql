CREATE TABLE "provider_connection_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"user_id" text,
	"provider" "payment_provider" NOT NULL,
	"environment" "provider_environment" NOT NULL,
	"provider_account_id" text,
	"state_token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "provider_connection_attempts" ADD CONSTRAINT "provider_connection_attempts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_connection_attempts" ADD CONSTRAINT "provider_connection_attempts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "provider_connection_attempts_business_id_idx" ON "provider_connection_attempts" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "provider_connection_attempts_expires_at_idx" ON "provider_connection_attempts" USING btree ("expires_at");