import "server-only";

import { paymongoRequest, type PayMongoFetch } from "@/lib/payments/providers/paymongo/client";
import { asString, type PayMongoRefund } from "@/lib/payments/providers/paymongo/types";

export async function createPaymongoRefund(input: {
  secretKey: string;
  paymentId: string;
  amountInCents: number;
  reason?: string;
  notes?: string;
  idempotencyKey?: string;
  fetchImpl?: PayMongoFetch;
}): Promise<{ providerRefundId: string }> {
  const response = await paymongoRequest<{ data: PayMongoRefund }>({
    secretKey: input.secretKey,
    method: "POST",
    path: "/v1/refunds",
    body: {
      data: {
        attributes: {
          amount: input.amountInCents,
          payment_id: input.paymentId,
          reason: input.reason ?? "requested_by_customer",
          ...(input.notes ? { notes: input.notes } : {}),
        },
      },
    },
    idempotencyKey: input.idempotencyKey,
    fetchImpl: input.fetchImpl,
  });
  const refundId = asString(response.data?.id);
  if (!refundId) throw new Error("PayMongo did not return a refund id.");
  return { providerRefundId: refundId };
}
