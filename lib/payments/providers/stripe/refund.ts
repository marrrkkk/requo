import "server-only";

import { stripeRequest, type StripeFetch } from "@/lib/payments/providers/stripe/client";
import { asString, type StripeRefund } from "@/lib/payments/providers/stripe/types";

export async function createStripeRefund(input: {
  secretKey: string;
  paymentIntentId: string;
  amountInCents: number;
  reason?: string;
  idempotencyKey?: string;
  stripeAccount?: string;
  fetchImpl?: StripeFetch;
}): Promise<{ providerRefundId: string }> {
  const refund = await stripeRequest<StripeRefund>({
    secretKey: input.secretKey,
    method: "POST",
    path: "/v1/refunds",
    form: {
      payment_intent: input.paymentIntentId,
      amount: String(input.amountInCents),
      reason: input.reason ?? "requested_by_customer",
    },
    idempotencyKey: input.idempotencyKey,
    stripeAccount: input.stripeAccount,
    fetchImpl: input.fetchImpl,
  });
  const refundId = asString(refund?.id);
  if (!refundId) throw new Error("Stripe did not return a refund id.");
  return { providerRefundId: refundId };
}
