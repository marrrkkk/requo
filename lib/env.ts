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
  APP_TOKEN_HASH_SECRET: emptyToUndefined(z.string().min(32)),
  ADMIN_EMAILS: emptyToUndefined(z.string().min(1)),
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
  RESEND_FROM_EMAIL: emptyToUndefined(z.string().trim().min(1)),
  RESEND_REPLY_TO_EMAIL: emptyToUndefined(z.email()),
  MAILTRAP_API_TOKEN: emptyToUndefined(z.string().min(1)),
  BREVO_API_KEY: emptyToUndefined(z.string().min(1)),
  EMAIL_DOMAIN: emptyToUndefined(z.string().trim().min(1)).default("test.requo.app"),
  EMAIL_FROM_DEFAULT: emptyToUndefined(z.string().trim().min(1)),
  EMAIL_FROM_NOTIFICATIONS: emptyToUndefined(z.string().trim().min(1)),
  EMAIL_FROM_SYSTEM: emptyToUndefined(z.string().trim().min(1)),
  EMAIL_FROM_QUOTES: emptyToUndefined(z.string().trim().min(1)),
  EMAIL_FROM_SUPPORT: emptyToUndefined(z.string().trim().min(1)),
  GROQ_API_KEY: emptyToUndefined(z.string().min(1)),
  GEMINI_API_KEY: emptyToUndefined(z.string().min(1)),
  OPENROUTER_API_KEY: emptyToUndefined(z.string().min(1)),
  PAYMONGO_SECRET_KEY: emptyToUndefined(z.string().min(1)),
  PAYMONGO_PUBLIC_KEY: emptyToUndefined(z.string().min(1)),
  PAYMONGO_WEBHOOK_SECRET: emptyToUndefined(z.string().min(1)),
  PADDLE_API_KEY: emptyToUndefined(z.string().min(1)),
  PADDLE_WEBHOOK_SECRET: emptyToUndefined(z.string().min(1)),
  PADDLE_PRO_PRICE_ID: emptyToUndefined(z.string().min(1)),
  PADDLE_PRO_YEARLY_PRICE_ID: emptyToUndefined(z.string().min(1)),
  PADDLE_BUSINESS_PRICE_ID: emptyToUndefined(z.string().min(1)),
  PADDLE_BUSINESS_YEARLY_PRICE_ID: emptyToUndefined(z.string().min(1)),
  PADDLE_ENVIRONMENT: emptyToUndefined(z.enum(["sandbox", "production"])).default("sandbox"),
  NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: emptyToUndefined(z.string().min(1)),
  NEXT_PUBLIC_PADDLE_ENVIRONMENT: emptyToUndefined(z.enum(["sandbox", "production"])).default("sandbox"),
  DEMO_OWNER_NAME: emptyToUndefined(z.string().trim().min(1)),
  DEMO_OWNER_EMAIL: emptyToUndefined(z.email()),
  DEMO_OWNER_PASSWORD: emptyToUndefined(z.string().min(8)),
  DEMO_BUSINESS_NAME: emptyToUndefined(z.string().trim().min(1)),
  DEMO_BUSINESS_SLUG: emptyToUndefined(z.string().trim().min(1)),
  DEMO_QUOTE_PUBLIC_TOKEN: emptyToUndefined(z.string().trim().min(1)),
  DEMO_EXPIRED_QUOTE_PUBLIC_TOKEN: emptyToUndefined(z.string().trim().min(1)),
  DEMO_VOIDED_QUOTE_PUBLIC_TOKEN: emptyToUndefined(z.string().trim().min(1)),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: emptyToUndefined(z.string().min(1)),
  VAPID_PRIVATE_KEY: emptyToUndefined(z.string().min(1)),
});

export const env = envSchema.parse(process.env);

export const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
  NEXT_PUBLIC_PADDLE_ENVIRONMENT: env.NEXT_PUBLIC_PADDLE_ENVIRONMENT,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
};

function hasConfiguredEmailSender() {
  return Boolean(
    env.EMAIL_FROM_DEFAULT ||
      env.EMAIL_FROM_NOTIFICATIONS ||
      env.EMAIL_FROM_SYSTEM ||
      env.EMAIL_FROM_QUOTES ||
      env.EMAIL_FROM_SUPPORT ||
      env.RESEND_FROM_EMAIL ||
      env.EMAIL_DOMAIN,
  );
}

export const isResendConfigured = Boolean(
  env.RESEND_API_KEY && hasConfiguredEmailSender(),
);
export const isMailtrapConfigured = Boolean(
  env.MAILTRAP_API_TOKEN && hasConfiguredEmailSender(),
);
export const isBrevoConfigured = Boolean(
  env.BREVO_API_KEY && hasConfiguredEmailSender(),
);
export const isEmailConfigured = Boolean(
  isResendConfigured || isMailtrapConfigured || isBrevoConfigured,
);

export const isGroqConfigured = Boolean(env.GROQ_API_KEY);
export const isGeminiConfigured = Boolean(env.GEMINI_API_KEY);
export const isOpenRouterConfigured = Boolean(env.OPENROUTER_API_KEY);
export const isSupabaseRealtimeConfigured = Boolean(env.SUPABASE_JWT_SECRET);

export const isPayMongoConfigured = Boolean(
  env.PAYMONGO_SECRET_KEY && env.PAYMONGO_PUBLIC_KEY,
);
export const isPaddleConfigured = Boolean(
  env.PADDLE_API_KEY && env.PADDLE_PRO_PRICE_ID,
);
export const isPushConfigured = Boolean(
  env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY,
);

