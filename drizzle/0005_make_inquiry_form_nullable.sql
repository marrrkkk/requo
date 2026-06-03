ALTER TABLE "inquiries" DROP CONSTRAINT "inquiries_business_inquiry_form_id_business_inquiry_forms_id_fk";
--> statement-breakpoint
ALTER TABLE "inquiries" ALTER COLUMN "business_inquiry_form_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_business_inquiry_form_id_business_inquiry_forms_id_fk" FOREIGN KEY ("business_inquiry_form_id") REFERENCES "public"."business_inquiry_forms"("id") ON DELETE set null ON UPDATE no action;