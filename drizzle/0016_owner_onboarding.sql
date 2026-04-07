alter table "profiles"
add column if not exists "onboarding_completed_at" timestamp with time zone;
