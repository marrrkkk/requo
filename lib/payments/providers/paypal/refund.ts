import "server-only";

import { paypalRequest, type PayPalFetch } from "@/lib/payments/providers/paypal/client";
import { asString, centsToPaypalValue, type PayPalRefund } from "@/lib/payments/providers/paypal/types";

export async function createPaypalRefund(input: {
  credentials: { clientId: string; clientSecret: string };
  environment: "test" | "live";
  captureId: string;
  amountInCents: number;
  currency: string;
  note?: string;
  idempotencyKey?: string;
  fetchImpl?: PayPalFetch;
}): Promise<{ providerRefundId: string }> {
  const currency = input.currency.toUpperCase();
  const refund = await paypalRequest<PayPalRefund>({
    clientId: input.credentials.clientId,
    clientSecret: input.credentials.clientSecret,
    environment: input.environment,
    method: "POST",
    path: `/v2/payments/captures/${encodeURIComponent(input.captureId)}/refund`,
    body: {
      amount: { currency_code: currency, value: centsToPaypalValue(input.amountInCents, currency) },
      ...(input.note ? { note_to_payer: input.note.slice(0, 255) } : {}),
    },
    requestId: input.idempotencyKey,
    fetchImpl: input.fetchImpl,
  });
  const refundId = asString(refund?.id);
  if (!refundId) throw new Error("PayPal did not return a refund id.");
  return { providerRefundId: refundId };
}
