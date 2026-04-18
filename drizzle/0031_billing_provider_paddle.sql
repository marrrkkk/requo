DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'billing_provider'
      AND e.enumlabel = 'lemonsqueezy'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'billing_provider'
      AND e.enumlabel = 'paddle'
  ) THEN
    ALTER TYPE "public"."billing_provider" RENAME VALUE 'lemonsqueezy' TO 'paddle';
  END IF;
END
$$;
