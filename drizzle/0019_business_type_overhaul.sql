ALTER TABLE "businesses"
ALTER COLUMN "business_type" SET DEFAULT 'general_project_services';--> statement-breakpoint

ALTER TABLE "business_inquiry_forms"
ALTER COLUMN "business_type" SET DEFAULT 'general_project_services';--> statement-breakpoint

UPDATE "businesses"
SET "business_type" = CASE "business_type"
  WHEN 'general_services' THEN 'general_project_services'
  WHEN 'home_services' THEN 'contractor_home_improvement'
  WHEN 'landscaping_outdoor' THEN 'landscaping_outdoor_services'
  WHEN 'creative_studio_agency' THEN 'creative_marketing_services'
  WHEN 'it_web_services' THEN 'web_it_services'
  WHEN 'photo_video_events' THEN 'photo_video_production'
  WHEN 'coaching_consulting' THEN 'consulting_professional_services'
  ELSE "business_type"
END
WHERE "business_type" IN (
  'general_services',
  'home_services',
  'landscaping_outdoor',
  'creative_studio_agency',
  'it_web_services',
  'photo_video_events',
  'coaching_consulting'
);--> statement-breakpoint

UPDATE "business_inquiry_forms"
SET "business_type" = CASE "business_type"
  WHEN 'general_services' THEN 'general_project_services'
  WHEN 'home_services' THEN 'contractor_home_improvement'
  WHEN 'landscaping_outdoor' THEN 'landscaping_outdoor_services'
  WHEN 'creative_studio_agency' THEN 'creative_marketing_services'
  WHEN 'it_web_services' THEN 'web_it_services'
  WHEN 'photo_video_events' THEN 'photo_video_production'
  WHEN 'coaching_consulting' THEN 'consulting_professional_services'
  ELSE "business_type"
END
WHERE "business_type" IN (
  'general_services',
  'home_services',
  'landscaping_outdoor',
  'creative_studio_agency',
  'it_web_services',
  'photo_video_events',
  'coaching_consulting'
);--> statement-breakpoint

UPDATE "businesses"
SET "inquiry_form_config" = jsonb_set(
  "inquiry_form_config",
  '{businessType}',
  to_jsonb(
    CASE "inquiry_form_config"->>'businessType'
      WHEN 'general_services' THEN 'general_project_services'
      WHEN 'home_services' THEN 'contractor_home_improvement'
      WHEN 'landscaping_outdoor' THEN 'landscaping_outdoor_services'
      WHEN 'creative_studio_agency' THEN 'creative_marketing_services'
      WHEN 'it_web_services' THEN 'web_it_services'
      WHEN 'photo_video_events' THEN 'photo_video_production'
      WHEN 'coaching_consulting' THEN 'consulting_professional_services'
      ELSE "inquiry_form_config"->>'businessType'
    END
  ),
  true
)
WHERE "inquiry_form_config" IS NOT NULL
  AND "inquiry_form_config" ? 'businessType'
  AND "inquiry_form_config"->>'businessType' IN (
    'general_services',
    'home_services',
    'landscaping_outdoor',
    'creative_studio_agency',
    'it_web_services',
    'photo_video_events',
    'coaching_consulting'
  );--> statement-breakpoint

UPDATE "business_inquiry_forms"
SET "inquiry_form_config" = jsonb_set(
  "inquiry_form_config",
  '{businessType}',
  to_jsonb(
    CASE "inquiry_form_config"->>'businessType'
      WHEN 'general_services' THEN 'general_project_services'
      WHEN 'home_services' THEN 'contractor_home_improvement'
      WHEN 'landscaping_outdoor' THEN 'landscaping_outdoor_services'
      WHEN 'creative_studio_agency' THEN 'creative_marketing_services'
      WHEN 'it_web_services' THEN 'web_it_services'
      WHEN 'photo_video_events' THEN 'photo_video_production'
      WHEN 'coaching_consulting' THEN 'consulting_professional_services'
      ELSE "inquiry_form_config"->>'businessType'
    END
  ),
  true
)
WHERE "inquiry_form_config" IS NOT NULL
  AND "inquiry_form_config" ? 'businessType'
  AND "inquiry_form_config"->>'businessType' IN (
    'general_services',
    'home_services',
    'landscaping_outdoor',
    'creative_studio_agency',
    'it_web_services',
    'photo_video_events',
    'coaching_consulting'
  );--> statement-breakpoint

UPDATE "inquiries"
SET "submitted_field_snapshot" = jsonb_set(
  "submitted_field_snapshot",
  '{businessType}',
  to_jsonb(
    CASE "submitted_field_snapshot"->>'businessType'
      WHEN 'general_services' THEN 'general_project_services'
      WHEN 'home_services' THEN 'contractor_home_improvement'
      WHEN 'landscaping_outdoor' THEN 'landscaping_outdoor_services'
      WHEN 'creative_studio_agency' THEN 'creative_marketing_services'
      WHEN 'it_web_services' THEN 'web_it_services'
      WHEN 'photo_video_events' THEN 'photo_video_production'
      WHEN 'coaching_consulting' THEN 'consulting_professional_services'
      ELSE "submitted_field_snapshot"->>'businessType'
    END
  ),
  true
)
WHERE "submitted_field_snapshot" IS NOT NULL
  AND "submitted_field_snapshot" ? 'businessType'
  AND "submitted_field_snapshot"->>'businessType' IN (
    'general_services',
    'home_services',
    'landscaping_outdoor',
    'creative_studio_agency',
    'it_web_services',
    'photo_video_events',
    'coaching_consulting'
  );--> statement-breakpoint
