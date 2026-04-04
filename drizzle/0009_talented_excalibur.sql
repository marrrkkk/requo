ALTER TABLE "workspaces" ADD COLUMN "inquiry_page_config" jsonb;--> statement-breakpoint
UPDATE "workspaces"
SET "inquiry_page_config" = jsonb_build_object(
  'template',
  'split',
  'eyebrow',
  'Inquiry page',
  'headline',
  concat('Tell ', "name", ' what you need.'),
  'description',
  coalesce(
    nullif(trim("inquiry_headline"), ''),
    concat('Use this page to send a detailed request directly to ', "name", '.')
  ),
  'brandTagline',
  nullif(trim("short_description"), ''),
  'formTitle',
  'Send inquiry',
  'formDescription',
  concat('Your request goes straight to ', "name", '.'),
  'cards',
  jsonb_build_array(
    jsonb_build_object(
      'id',
      'details',
      'title',
      'Clear details',
      'description',
      'Share the service, timing, and scope in one place so the request is easy to review.',
      'icon',
      'details'
    ),
    jsonb_build_object(
      'id',
      'upload',
      'title',
      'Reference file upload',
      'description',
      'Attach a file when artwork, plans, photos, or notes help explain the request.',
      'icon',
      'upload'
    ),
    jsonb_build_object(
      'id',
      'owner',
      'title',
      'Direct review',
      'description',
      'Your inquiry goes straight to the business owner without exposing private workspace data.',
      'icon',
      'owner'
    )
  )
)
WHERE "inquiry_page_config" IS NULL;
