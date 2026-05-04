ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS company_size text;
