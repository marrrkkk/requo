CREATE TABLE IF NOT EXISTS "quote_acceptances" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"quote_id" text NOT NULL,
	"quote_version" integer NOT NULL,
	"signer_name" text NOT NULL,
	"signer_email" text,
	"acceptance_method" text DEFAULT 'typed_name' NOT NULL,
	"acceptance_text" text NOT NULL,
	"acceptance_text_version" integer DEFAULT 1 NOT NULL,
	"snapshot" jsonb NOT NULL,
	"snapshot_hash" text NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quote_acceptances_business_id_businesses_id_fk') THEN
    ALTER TABLE "quote_acceptances" ADD CONSTRAINT "quote_acceptances_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quote_acceptances_quote_id_quotes_id_fk') THEN
    ALTER TABLE "quote_acceptances" ADD CONSTRAINT "quote_acceptances_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quote_acceptances_business_id_idx" ON "quote_acceptances" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quote_acceptances_quote_id_idx" ON "quote_acceptances" USING btree ("quote_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "quote_acceptances_quote_version_unique" ON "quote_acceptances" USING btree ("quote_id","quote_version");--> statement-breakpoint
ALTER TABLE "public"."quote_acceptances" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_acceptances' AND policyname = 'deny_all') THEN
    CREATE POLICY "deny_all" ON "public"."quote_acceptances" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;
