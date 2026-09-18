import { createPayMongoAdapter } from "@/lib/payments/providers/paymongo";
import { createPayPalAdapter } from "@/lib/payments/providers/paypal";
import { createStripeAdapter } from "@/lib/payments/providers/stripe";
import type {
  PaymentProvider,
  PaymentProviderAdapter,
} from "@/lib/payments/types";

const registry = new Map<PaymentProvider, PaymentProviderAdapter>([
  ["paymongo", createPayMongoAdapter()],
  ["stripe", createStripeAdapter()],
  ["paypal", createPayPalAdapter()],
]);

export function getPaymentAdapter(provider: PaymentProvider): PaymentProviderAdapter {
  const adapter = registry.get(provider);
  if (!adapter) throw new Error(`Unsupported payment provider: ${provider}`);
  return adapter;
}

export function registerPaymentAdapter(adapter: PaymentProviderAdapter): void {
  registry.set(adapter.provider, adapter);
}
