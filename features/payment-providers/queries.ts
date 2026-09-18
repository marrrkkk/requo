import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/lib/db/client";
import { paymentProviderConnections, payments } from "@/lib/db/schema";
import { getBusinessInvoiceDetailCacheTags, hotBusinessCacheLife } from "@/lib/cache/business-tags";
import { cacheLife, cacheTag } from "next/cache";

export type ProviderConnectionView = {
  id: string;
  provider: typeof paymentProviderConnections.$inferSelect.provider;
  environment: typeof paymentProviderConnections.$inferSelect.environment;
  status: typeof paymentProviderConnections.$inferSelect.status;
  authMode: typeof paymentProviderConnections.$inferSelect.authMode;
  publicHint: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Only `ready` connections can create checkouts, refunds, or refreshes. */
export function isOperableConnection(connection: Pick<ProviderConnectionView, "status">): boolean {
  return connection.status === "ready";
}

export async function listProviderConnectionsForBusiness(
  businessId: string,
): Promise<ProviderConnectionView[]> {
  return db
    .select({
      id: paymentProviderConnections.id,
      provider: paymentProviderConnections.provider,
      environment: paymentProviderConnections.environment,
      status: paymentProviderConnections.status,
      authMode: paymentProviderConnections.authMode,
      publicHint: paymentProviderConnections.publicHint,
      createdAt: paymentProviderConnections.createdAt,
      updatedAt: paymentProviderConnections.updatedAt,
    })
    .from(paymentProviderConnections)
    .where(eq(paymentProviderConnections.businessId, businessId));
}

export async function getProviderConnectionForBusiness(
  businessId: string,
  connectionId: string,
): Promise<ProviderConnectionView | null> {
  const [row] = await db
    .select({
      id: paymentProviderConnections.id,
      provider: paymentProviderConnections.provider,
      environment: paymentProviderConnections.environment,
      status: paymentProviderConnections.status,
      authMode: paymentProviderConnections.authMode,
      publicHint: paymentProviderConnections.publicHint,
      createdAt: paymentProviderConnections.createdAt,
      updatedAt: paymentProviderConnections.updatedAt,
    })
    .from(paymentProviderConnections)
    .where(
      and(
        eq(paymentProviderConnections.id, connectionId),
        eq(paymentProviderConnections.businessId, businessId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export function getProviderWebhookPath(
  provider: string,
  connectionId: string,
) {
  return `/api/payments/webhooks/${provider}/${connectionId}`;
}

export type InvoiceProviderPaymentView = {
  id: string;
  provider: typeof payments.$inferSelect.provider;
  environment: string | null;
  connectionHint: string | null;
  amountInCents: number;
  refundedAmountInCents: number;
  status: typeof payments.$inferSelect.status;
  providerCheckoutId: string | null;
  providerPaymentId: string | null;
  checkoutUrl: string | null;
  paymentDate: string;
  createdAt: Date;
};

const getCachedInvoiceProviderPayments = cache(
  async ({
    businessId,
    invoiceId,
  }: {
    businessId: string;
    invoiceId: string;
  }): Promise<InvoiceProviderPaymentView[]> => {
    "use cache";
    cacheLife(hotBusinessCacheLife);
    cacheTag(...getBusinessInvoiceDetailCacheTags(businessId, invoiceId));
    const rows = await db
      .select({
        id: payments.id,
        provider: payments.provider,
        environment: paymentProviderConnections.environment,
        connectionHint: paymentProviderConnections.publicHint,
        amountInCents: payments.amountInCents,
        refundedAmountInCents: payments.refundedAmountInCents,
        status: payments.status,
        providerCheckoutId: payments.providerCheckoutId,
        providerPaymentId: payments.providerPaymentId,
        checkoutUrl: payments.checkoutUrl,
        paymentDate: payments.paymentDate,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .leftJoin(
        paymentProviderConnections,
        eq(payments.providerConnectionId, paymentProviderConnections.id),
      )
      .where(
        and(
          eq(payments.invoiceId, invoiceId),
          eq(payments.businessId, businessId),
          eq(payments.source, "provider"),
        ),
      )
      .orderBy(desc(payments.createdAt));
    return rows;
  },
);

export async function getInvoiceProviderPaymentsForBusiness({
  businessId,
  invoiceId,
}: {
  businessId: string;
  invoiceId: string;
}): Promise<InvoiceProviderPaymentView[]> {
  return getCachedInvoiceProviderPayments({ businessId, invoiceId });
}

export async function getProviderPaymentForBusiness({
  businessId,
  paymentId,
}: {
  businessId: string;
  paymentId: string;
}) {
  const [row] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.id, paymentId),
        eq(payments.businessId, businessId),
        eq(payments.source, "provider"),
      ),
    )
    .limit(1);
  return row ?? null;
}

// ponytail: fake ping only for PR1 settings UX; real provider verification lands in PR3-5.
export function fakePingConnection(): { ok: true } {
  return { ok: true };
}
