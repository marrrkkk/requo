DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_source') THEN
    CREATE TYPE "public"."payment_source" AS ENUM('manual');
  END IF;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "business_payment_counters" (
	"business_id" text NOT NULL,
	"year" integer NOT NULL,
	"last_sequence" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_payment_counters_business_id_year_pk" PRIMARY KEY("business_id","year"),
	CONSTRAINT "business_payment_counters_year_valid" CHECK ("business_payment_counters"."year" >= 2000 and "business_payment_counters"."year" <= 2100),
	CONSTRAINT "business_payment_counters_sequence_valid" CHECK ("business_payment_counters"."last_sequence" >= 0)
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_payment_counters_business_id_businesses_id_fk') THEN
    ALTER TABLE "business_payment_counters" ADD CONSTRAINT "business_payment_counters_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "payment_number" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "source" "payment_source" DEFAULT 'manual' NOT NULL;--> statement-breakpoint
WITH numbered AS (
	SELECT "id", "business_id", (EXTRACT(YEAR FROM "created_at"))::integer AS "yr",
		ROW_NUMBER() OVER (PARTITION BY "business_id", (EXTRACT(YEAR FROM "created_at"))::integer ORDER BY "created_at", "id") AS "rn"
	FROM "payments" WHERE "payment_number" IS NULL
) UPDATE "payments" SET "payment_number" = 'PAY-' || numbered."yr" || '-' || LPAD(numbered."rn"::text, 4, '0') FROM numbered WHERE "payments"."id" = numbered."id";--> statement-breakpoint
INSERT INTO "business_payment_counters" ("business_id", "year", "last_sequence")
SELECT "business_id", (EXTRACT(YEAR FROM "created_at"))::integer AS "yr", COUNT(*)::integer
FROM "payments" GROUP BY "business_id", "yr"
ON CONFLICT ("business_id", "year") DO UPDATE SET "last_sequence" = GREATEST("business_payment_counters"."last_sequence", EXCLUDED."last_sequence");--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "payment_number" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payments_business_payment_number_unique" ON "payments" USING btree ("business_id","payment_number");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payments_business_idempotency_unique" ON "payments" USING btree ("business_id","idempotency_key") WHERE "payments"."idempotency_key" is not null;--> statement-breakpoint
ALTER TABLE "public"."business_payment_counters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_payment_counters' AND policyname = 'deny_all') THEN
    CREATE POLICY "deny_all" ON "public"."business_payment_counters" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;
