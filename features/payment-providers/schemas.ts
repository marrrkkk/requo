import { z } from "zod";

import {
  paymentProviders,
  providerEnvironments,
} from "@/lib/db/schema/payment-providers";

export const paymentProviderSchema = z.enum(paymentProviders);
export const providerEnvironmentSchema = z.enum(providerEnvironments);

export const paymongoCredentialsSchema = z.object({
  secretKey: z.string().trim().min(1),
  webhookSecret: z.string().trim().min(1),
});

export const stripeCredentialsSchema = z.object({
  secretKey: z.string().trim().min(1),
  webhookSecret: z.string().trim().min(1),
});

export const paypalCredentialsSchema = z.object({
  clientId: z.string().trim().min(1),
  clientSecret: z.string().trim().min(1),
  webhookId: z.string().trim().min(1),
});

export const providerCredentialsSchema = z.discriminatedUnion("provider", [
  z.object({ provider: z.literal("paymongo"), environment: providerEnvironmentSchema, credentials: paymongoCredentialsSchema }),
  z.object({ provider: z.literal("stripe"), environment: providerEnvironmentSchema, credentials: stripeCredentialsSchema }),
  z.object({ provider: z.literal("paypal"), environment: providerEnvironmentSchema, credentials: paypalCredentialsSchema }),
]);

export const connectProviderSchema = providerCredentialsSchema;

export type ConnectProviderInput = z.infer<typeof connectProviderSchema>;
