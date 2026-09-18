import type { PaymentProviderConnection } from "@/lib/db/schema/payment-providers";

export type ConnectionCapability = {
  paymentsReady: boolean;
  refundsReady: boolean;
  reconciliationReady: boolean;
  ready: boolean;
};

type StripeAccountShape = {
  charges_enabled?: boolean;
  details_submitted?: boolean;
  requirements?: { currently_due?: string[] } | null;
};

/**
 * Stripe readiness predicate (Q10): capable means able to accept and refund,
 * never merely "callback succeeded". `payouts_enabled` is deliberately not
 * a requirement.
 */
export function stripeReadinessFromAccount(account: StripeAccountShape): ConnectionCapability {
  const paymentsReady = account.charges_enabled === true;
  const complete =
    account.details_submitted === true && (account.requirements?.currently_due ?? []).length === 0;
  const ready = paymentsReady && complete;
  return {
    paymentsReady,
    refundsReady: paymentsReady,
    reconciliationReady: true,
    ready,
  };
}

export function connectionStatusForCapability(
  capability: Pick<ConnectionCapability, "ready">,
): "ready" | "action_required" {
  return capability.ready ? "ready" : "action_required";
}

/**
 * Provider operations (checkout, refresh, refund) require a `ready`
 * connection. Returns a user-safe error message, or null when allowed.
 * Existing BYO rows backfill to `ready`, so current behavior is unchanged.
 */
export function providerOperationBlocked(
  connection: Pick<PaymentProviderConnection, "status">,
): string | null {
  if (connection.status === "ready") return null;
  if (connection.status === "revoked")
    return "This provider connection was revoked. Reconnect to continue accepting payments.";
  return "This provider connection setup is incomplete. Finish setup before operating on payments.";
}
