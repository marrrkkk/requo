import { z } from "zod";

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }

    return value;
  }, schema.optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  NEXT_PUBLIC_BETTER_AUTH_URL: emptyToUndefined(z.url()),
  VERCEL_URL: emptyToUndefined(z.string().min(1)),
  GOOGLE_CLIENT_ID: emptyToUndefined(z.string().min(1)),
  GOOGLE_CLIENT_SECRET: emptyToUndefined(z.string().min(1)),
  MICROSOFT_CLIENT_ID: emptyToUndefined(z.string().min(1)),
  MICROSOFT_CLIENT_SECRET: emptyToUndefined(z.string().min(1)),
  MICROSOFT_TENANT_ID: emptyToUndefined(z.string().min(1)).default("common"),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: emptyToUndefined(z.string().min(1)),
  RESEND_API_KEY: emptyToUndefined(z.string().min(1)),
  RESEND_FROM_EMAIL: emptyToUndefined(z.email()),
  RESEND_REPLY_TO_EMAIL: emptyToUndefined(z.email()),
  OPENROUTER_API_KEY: emptyToUndefined(z.string().min(1)),
  OPENROUTER_DEFAULT_MODEL: emptyToUndefined(z.string().min(1)).default(
    "openai/gpt-5-mini",
  ),
  DEMO_OWNER_NAME: emptyToUndefined(z.string().trim().min(1)),
  DEMO_OWNER_EMAIL: emptyToUndefined(z.email()),
  DEMO_OWNER_PASSWORD: emptyToUndefined(z.string().min(8)),
  DEMO_BUSINESS_NAME: emptyToUndefined(z.string().trim().min(1)),
  DEMO_BUSINESS_SLUG: emptyToUndefined(z.string().trim().min(1)),
  DEMO_QUOTE_PUBLIC_TOKEN: emptyToUndefined(z.string().trim().min(1)),
  DEMO_EXPIRED_QUOTE_PUBLIC_TOKEN: emptyToUndefined(z.string().trim().min(1)),
});

export const env = envSchema.parse(process.env);

export const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

export const isResendConfigured = Boolean(
  env.RESEND_API_KEY && env.RESEND_FROM_EMAIL,
);

export const isOpenRouterConfigured = Boolean(env.OPENROUTER_API_KEY);
export const isSupabaseRealtimeConfigured = Boolean(env.SUPABASE_JWT_SECRET);
export const isGoogleCalendarConfigured = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
);
