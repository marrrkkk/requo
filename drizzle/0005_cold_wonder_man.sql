CREATE TABLE "inquiry_duplicates" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"inquiry_id" text NOT NULL,
	"original_inquiry_id" text NOT NULL,
	"reason" text NOT NULL,
	"token_overlap" integer,
	"dismissed_at" timestamp with time zone,
	"dismissed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "qualification_score" integer;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "qualification_temperature" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "qualification_signals" jsonb;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "qualified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inquiry_duplicates" ADD CONSTRAINT "inquiry_duplicates_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_duplicates" ADD CONSTRAINT "inquiry_duplicates_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_duplicates" ADD CONSTRAINT "inquiry_duplicates_original_inquiry_id_inquiries_id_fk" FOREIGN KEY ("original_inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_duplicates" ADD CONSTRAINT "inquiry_duplicates_dismissed_by_user_id_fk" FOREIGN KEY ("dismissed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inquiry_duplicates_business_id_idx" ON "inquiry_duplicates" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inquiry_duplicates_inquiry_id_idx" ON "inquiry_duplicates" USING btree ("inquiry_id");--> statement-breakpoint
CREATE INDEX "inquiry_duplicates_original_inquiry_id_idx" ON "inquiry_duplicates" USING btree ("original_inquiry_id");--> statement-breakpoint
CREATE INDEX "inquiries_business_qualification_score_idx" ON "inquiries" USING btree ("business_id","qualification_score");