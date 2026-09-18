import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  ProviderConnectionManager,
  StripeConnectNotice,
} from "@/features/payment-providers/components/provider-connection-manager";
import {
  getProviderWebhookPath,
  listProviderConnectionsForBusiness,
} from "@/features/payment-providers/queries";
import { isStripePlatformConfigured } from "@/lib/env";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOwnerPageContext } from "../_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Integrations",
  description: "Connect payment providers for customer invoice payments.",
});

export const instant = true;

const REQUIRED_EVENTS: Record<string, string[]> = {
  paymongo: [
    "payment.paid",
    "payment.failed",
    "payment.refunded",
    "payment.refund.updated",
    "checkout_session.payment.paid",
  ],
  stripe: [
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
    "checkout.session.expired",
    "payment_intent.succeeded",
    "payment_intent.payment_failed",
    "payment_intent.canceled",
    "charge.refunded",
    "charge.refund.updated",
  ],
  paypal: [
    "PAYMENT.CAPTURE.COMPLETED",
    "PAYMENT.CAPTURE.PENDING",
    "PAYMENT.CAPTURE.DENIED",
    "PAYMENT.CAPTURE.REFUNDED",
  ],
};

const SETUP_NOTES: Record<string, string> = {
  paymongo:
    "Create separate test and live webhook endpoints in PayMongo. Each endpoint maps to one Requo connection URL below.",
  stripe:
    "Create one endpoint per environment in Stripe. Copy the endpoint signing secret (whsec_…) into the matching Requo connection.",
  paypal:
    "Create one webhook per environment in PayPal. Copy the webhook ID into the matching Requo connection for signature verification.",
};

export default function IntegrationsSettingsPage() {
  return (
    <>
      <h1 className="sr-only">Integrations</h1>
      <div className="mx-auto w-full max-w-2xl">
        <Suspense fallback={<IntegrationsStaticFallback />}>
          <IntegrationsContent />
        </Suspense>
      </div>
    </>
  );
}

function IntegrationsStaticFallback() {
  return (
    <div className="flex flex-col gap-6">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-48 w-full rounded-lg" />
      ))}
    </div>
  );
}

async function IntegrationsContent() {
  const { businessContext } = await getBusinessOwnerPageContext();
  const businessId = businessContext.business.id;
  const connections = await listProviderConnectionsForBusiness(businessId);

  return (
    <div className="flex flex-col gap-6">
      <StripeConnectNotice />
      <ProviderConnectionManager
        connections={connections}
        platformConnectEnabled={isStripePlatformConfigured}
      />

      {[
        { provider: "paymongo", label: "PayMongo" },
        { provider: "stripe", label: "Stripe" },
        { provider: "paypal", label: "PayPal" },
      ].map(({ provider, label }) => {
        const forProvider = connections.filter((c) => c.provider === provider);
        // A platform-linked connection verifies with Requo's platform endpoint
        // secret, so the owner pastes nothing here.
        const allLinked =
          forProvider.length > 0 && forProvider.every((c) => c.authMode === "platform");
        return (
          <section key={provider} className="section-panel" data-padding="default">
            <h2 className="text-sm font-semibold tracking-tight">
              {label} webhooks
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {allLinked
                ? "Webhook delivery is handled by Requo's platform configuration. You do not need to create an endpoint or paste a signing secret."
                : SETUP_NOTES[provider]}
            </p>
            {forProvider.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Connect {label} above to get a webhook URL.
              </p>
            ) : (
              forProvider.map((c) => (
                <div key={c.id} className="mt-3 flex flex-col gap-1">
                  <span className="meta-label">
                    {c.environment} · {c.publicHint ?? "••••"}
                  </span>
                  <code className="rounded bg-muted px-2 py-1 text-xs break-all">
                    {getProviderWebhookPath(provider, c.id)}
                  </code>
                </div>
              ))
            )}
            {allLinked ? null : (
              <div className="mt-3 flex flex-col gap-1">
                <span className="meta-label">Events to enable</span>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {REQUIRED_EVENTS[provider].map((e) => (
                    <li key={e}>
                      <code className="text-xs">{e}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
