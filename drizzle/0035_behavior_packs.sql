CREATE TYPE "public"."behavior_pack" AS ENUM('contractors_home_services', 'creative_marketing', 'professional_it', 'photo_video', 'events_rentals', 'fabrication_signage');--> statement-breakpoint
CREATE TABLE "business_pack_assignment_history" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"pack" "behavior_pack",
	"pack_version" integer DEFAULT 1 NOT NULL,
	"source" text NOT NULL,
	"actor_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_pack_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"pack" "behavior_pack",
	"pack_version" integer DEFAULT 1 NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_pack_assignments_pack_version_positive" CHECK ("business_pack_assignments"."pack_version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "business_pack_assignment_history" ADD CONSTRAINT "business_pack_assignment_history_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_pack_assignment_history" ADD CONSTRAINT "business_pack_assignment_history_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_pack_assignments" ADD CONSTRAINT "business_pack_assignments_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_pack_assignment_history_business_created_idx" ON "business_pack_assignment_history" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "business_pack_assignments_business_unique" ON "business_pack_assignments" USING btree ("business_id");--> statement-breakpoint
ALTER TABLE "public"."business_pack_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."business_pack_assignment_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_pack_assignments' AND policyname = 'deny_all') THEN
    CREATE POLICY "deny_all" ON "public"."business_pack_assignments" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_pack_assignment_history' AND policyname = 'deny_all') THEN
    CREATE POLICY "deny_all" ON "public"."business_pack_assignment_history" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;