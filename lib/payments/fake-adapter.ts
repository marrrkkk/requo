import { prefixedId as createId } from "@/lib/ids";
import type {
  NormalizedWebhook,
  PaymentProvider,
  PaymentProviderAdapter,
  ProviderEnvironment,
  ProviderPaymentSnapshot,
} from "@/lib/payments/types";

/**
 * Test-only adapter (PR2). No HTTP. PR3-5 replace registry entries with real
 * provider adapters; this one stays for tests.
 *
 * Test payload shape for parseWebhook:
 * `{ providerEventId, rawType, snapshot }` where snapshot is a full
 * ProviderPaymentSnapshot or null for unknown/ignored types.
 */
export function createFakeAdapter(provider: PaymentProvider): PaymentProviderAdapter {
  const snapshots = new Map<string, ProviderPaymentSnapshot>();

  return {
    provider,

    supportsCurrency: () => true,

    async createCheckout(input) {
      const providerCheckoutId = `chk_fake_${createId("t").slice(2, 10)}`;
      const snapshot: ProviderPaymentSnapshot = {
        provider,
        environment: input.environment,
        providerCheckoutId,
        status: "pending",
        amountInCents: input.amountInCents,
        refundedAmountInCents: 0,
        currency: input.currency,
        invoiceId: input.invoiceId,
        businessId: input.businessId,
        connectionId: input.connectionId,
      };
      snapshots.set(providerCheckoutId, snapshot);
      return {
        checkoutUrl: `https://example.com/fake-checkout/${providerCheckoutId}`,
        providerCheckoutId,
      };
    },

    async getPayment(input) {
      const found = snapshots.get(input.providerPaymentId);
      if (!found) throw new Error("Fake payment not found.");
      return found;
    },

    async refundPayment() {
      return { accepted: true, providerRefundId: `rf_fake_${Date.now()}` };
    },

    async verifyWebhook() {
      return { ok: true };
    },

    parseWebhook(payload: unknown, environment: ProviderEnvironment): NormalizedWebhook {
      const body = payload as {
        providerEventId?: unknown;
        rawType?: unknown;
        snapshot?: ProviderPaymentSnapshot | null;
      };
      const providerEventId =
        typeof body?.providerEventId === "string" && body.providerEventId
          ? body.providerEventId
          : createId("evt");
      const rawType = typeof body?.rawType === "string" ? body.rawType : "unknown";
      const rawSnapshot =
        body?.snapshot === null || body?.snapshot === undefined ? null : body.snapshot;
      const snapshot =
        rawSnapshot === null
          ? null
          : {
              ...rawSnapshot,
              provider,
              environment,
              occurredAt:
                rawSnapshot.occurredAt instanceof Date
                  ? rawSnapshot.occurredAt
                  : typeof rawSnapshot.occurredAt === "string"
                    ? new Date(rawSnapshot.occurredAt)
                    : undefined,
            };
      if (snapshot?.providerPaymentId) snapshots.set(snapshot.providerPaymentId, snapshot);
      if (snapshot?.providerCheckoutId) snapshots.set(snapshot.providerCheckoutId, snapshot);
      return { providerEventId, rawType, snapshot, rawPayload: payload };
    },
  };
}
