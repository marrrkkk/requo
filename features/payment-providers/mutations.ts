import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";

import { writeAuditLog } from "@/features/audit/mutations";
import { countedPaymentSql } from "@/features/invoices/queries";
import { getTodayUtcDateString } from "@/features/quotes/utils";
import { db } from "@/lib/db/client";
import { prefixedId as createId } from "@/lib/ids";
import {
  connectionStatusForCapability,
  providerOperationBlocked,
} from "@/lib/payments/connection-status";
import {
  businessMembers,
  businesses,
  invoices,
  paymentProviderConnections,
  payments,
  providerConnectionAttempts,
} from "@/lib/db/schema";
import type { StripeFetch } from "@/lib/payments/providers/stripe/client";
import {
  createAccountLink,
  createConnectedAccount,
  readinessFromAccount,
  retrieveConnectedAccount,
} from "@/lib/payments/providers/stripe/connect";
import { getStripePlatformConfig } from "@/lib/payments/providers/stripe/platform";
import { getPaymentAdapter } from "@/lib/payments/adapters";
import type { PaymentProviderAdapter, ProviderCredentials } from "@/lib/payments/types";
import type {
  PaymentProvider,
  ProviderEnvironment,
} from "@/lib/db/schema/payment-providers";
import { decryptSecret, encryptSecret } from "@/lib/payments/secret-box";

function maskSecret(value: string): string {
  const tail = value.replace(/[^A-Za-z0-9]/g, "").slice(-4);
  return `••••${tail || "····"}`;
}

function publicHintFor(provider: PaymentProvider, credentials: Record<string, string>): string {
  if (provider === "paypal") return maskSecret(credentials.clientId ?? "");
  return maskSecret(credentials.secretKey ?? "");
}

export async function connectProviderForBusiness(input: {
  businessId: string;
  actorUserId: string;
  provider: PaymentProvider;
  environment: ProviderEnvironment;
  credentials: Record<string, string>;
}): Promise<{ id: string; updated: boolean } | { error: string }> {
  const now = new Date();
  const ciphertext = encryptSecret(JSON.stringify(input.credentials));
  const publicHint = publicHintFor(input.provider, input.credentials);

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        id: paymentProviderConnections.id,
        authMode: paymentProviderConnections.authMode,
      })
      .from(paymentProviderConnections)
      .where(
        and(
          eq(paymentProviderConnections.businessId, input.businessId),
          eq(paymentProviderConnections.provider, input.provider),
          eq(paymentProviderConnections.environment, input.environment),
        ),
      )
      .limit(1);

    // Symmetric with startStripePlatformConnection: a platform-linked account
    // is never silently replaced by pasted keys. Disconnect first.
    if (existing && existing.authMode === "platform")
      return { error: "Disconnect the linked provider account first." } as const;

    if (existing) {
      await tx
        .update(paymentProviderConnections)
        .set({ credentialsCiphertext: ciphertext, publicHint, updatedAt: now })
        .where(eq(paymentProviderConnections.id, existing.id));
      await writeAuditLog(tx, {
        businessId: input.businessId,
        actorUserId: input.actorUserId,
        entityType: "connection",
        entityId: existing.id,
        action: "connection.updated",
        metadata: {
          provider: input.provider,
          environment: input.environment,
          authMode: "byo",
        },
        createdAt: now,
      });
      return { id: existing.id, updated: true as const };
    }

    const id = createId("ppc");
    await tx.insert(paymentProviderConnections).values({
      id,
      businessId: input.businessId,
      provider: input.provider,
      environment: input.environment,
      credentialsCiphertext: ciphertext,
      publicHint,
      createdAt: now,
      updatedAt: now,
    });
    await writeAuditLog(tx, {
      businessId: input.businessId,
      actorUserId: input.actorUserId,
      entityType: "connection",
      entityId: id,
      action: "connection.connected",
      metadata: {
        provider: input.provider,
        environment: input.environment,
        authMode: "byo",
      },
      createdAt: now,
    });
    return { id, updated: false as const };
  });
}

export async function disconnectProviderForBusiness(input: {
  businessId: string;
  actorUserId: string;
  connectionId: string;
}) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(paymentProviderConnections)
      .where(
        and(
          eq(paymentProviderConnections.id, input.connectionId),
          eq(paymentProviderConnections.businessId, input.businessId),
        ),
      )
      .limit(1);
    if (!row) return null;
    await tx
      .delete(paymentProviderConnections)
      .where(eq(paymentProviderConnections.id, row.id));
    // Written after the delete: the audit row is independent of the connection
    // and must survive it, so the trail keeps a record of the removal.
    await writeAuditLog(tx, {
      businessId: input.businessId,
      actorUserId: input.actorUserId,
      entityType: "connection",
      entityId: row.id,
      action: "connection.disconnected",
      metadata: {
        provider: row.provider,
        environment: row.environment,
        authMode: row.authMode,
      },
      createdAt: new Date(),
    });
    return { id: row.id };
  });
}

async function invoiceNetPaid(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  businessId: string,
  invoiceId: string,
): Promise<number> {
  const [paid] = await tx
    .select({
      total: sql<number>`coalesce(sum(${payments.amountInCents} - ${payments.refundedAmountInCents}), 0)`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.invoiceId, invoiceId),
        eq(payments.businessId, businessId),
        sql`${countedPaymentSql}`,
      ),
    );
  return Number(paid?.total ?? 0);
}

export async function createProviderCheckoutForBusiness(input: {
  businessId: string;
  actorUserId: string;
  invoiceId: string;
  connectionId: string;
  amountInCents: number;
  successUrl: string;
  cancelUrl: string;
  adapter?: PaymentProviderAdapter;
  credentials?: ProviderCredentials;
}): Promise<
  | { paymentId: string; checkoutUrl: string; providerCheckoutId: string }
  | { error: string }
> {
  return db.transaction(async (tx) => {
    const [invoice] = await tx
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, input.invoiceId), eq(invoices.businessId, input.businessId)))
      .limit(1);
    if (!invoice) return { error: "Invoice not found." } as const;
    if (invoice.status === "draft") return { error: "Mark the invoice as sent before creating a payment link." } as const;
    if (invoice.status === "voided") return { error: "Void invoices cannot receive payments." } as const;

    const [connection] = await tx
      .select()
      .from(paymentProviderConnections)
      .where(
        and(
          eq(paymentProviderConnections.id, input.connectionId),
          eq(paymentProviderConnections.businessId, input.businessId),
        ),
      )
      .limit(1);
    if (!connection) return { error: "Payment provider connection not found." } as const;
    const blocked = providerOperationBlocked(connection);
    if (blocked) return { error: blocked } as const;

    const netPaid = await invoiceNetPaid(tx, input.businessId, input.invoiceId);
    const remaining = Math.max(0, invoice.totalInCents - netPaid);
    if (!Number.isSafeInteger(input.amountInCents) || input.amountInCents <= 0)
      return { error: "Checkout amount must be greater than zero." } as const;
    if (input.amountInCents > remaining)
      return { error: "Checkout amount cannot exceed the remaining balance." } as const;

    const now = new Date();
    const paymentId = createId("pay");
    const idempotencyKey = createId("cio");
    await tx.insert(payments).values({
      id: paymentId,
      businessId: input.businessId,
      invoiceId: input.invoiceId,
      amountInCents: input.amountInCents,
      paymentDate: getTodayUtcDateString(),
      method: "other",
      reference: null,
      notes: null,
      createdBy: input.actorUserId,
      source: "provider",
      provider: connection.provider,
      providerConnectionId: connection.id,
      providerCheckoutId: null,
      providerPaymentId: null,
      status: "pending",
      refundedAmountInCents: 0,
      paidAt: null,
      checkoutUrl: null,
      metadata: { provider: connection.provider, environment: connection.environment },
      checkoutIdempotencyKey: idempotencyKey,
      createdAt: now,
      updatedAt: now,
    });

    const adapter = input.adapter ?? getPaymentAdapter(connection.provider);
    if (!adapter.supportsCurrency(invoice.currency))
      return { error: "This invoice currency is not supported by the provider." } as const;
    let credentials = input.credentials;
    if (!credentials) {
      const [row] = await tx
        .select({ ciphertext: paymentProviderConnections.credentialsCiphertext })
        .from(paymentProviderConnections)
        .where(eq(paymentProviderConnections.id, connection.id))
        .limit(1);
      if (!row) return { error: "Payment provider connection not found." } as const;
      credentials = JSON.parse(decryptSecret(row.ciphertext)) as ProviderCredentials;
    }

    let checkout: { checkoutUrl: string; providerCheckoutId: string };
    try {
      checkout = await adapter.createCheckout({
        credentials,
        environment: connection.environment,
        amountInCents: input.amountInCents,
        currency: invoice.currency,
        invoiceId: invoice.id,
        businessId: input.businessId,
        connectionId: connection.id,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        idempotencyKey,
        metadata: {
          requoInvoiceId: invoice.id,
          requoInvoiceNumber: invoice.invoiceNumber,
          requoBusinessId: input.businessId,
          requoConnectionId: connection.id,
        },
      });
    } catch (error) {
      await tx.update(payments).set({ status: "failed", updatedAt: new Date() }).where(eq(payments.id, paymentId));
      const message = error instanceof Error ? error.message : "Provider checkout failed.";
      return { error: message } as const;
    }

    await tx
      .update(payments)
      .set({ providerCheckoutId: checkout.providerCheckoutId, checkoutUrl: checkout.checkoutUrl, reference: checkout.providerCheckoutId, updatedAt: new Date() })
      .where(eq(payments.id, paymentId));
    return { paymentId, checkoutUrl: checkout.checkoutUrl, providerCheckoutId: checkout.providerCheckoutId } as const;
  });
}

export async function initiateProviderRefundForBusiness(input: {
  businessId: string;
  actorUserId: string;
  paymentId: string;
  amountInCents: number;
  adapter?: PaymentProviderAdapter;
  credentials?: ProviderCredentials;
}): Promise<{ providerRefundId: string; idempotencyKey: string } | { error: string }> {
  return db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(payments)
      .where(and(eq(payments.id, input.paymentId), eq(payments.businessId, input.businessId)))
      .limit(1);
    if (!payment || payment.source !== "provider") return { error: "Provider payment not found." } as const;
    if (payment.status !== "succeeded" && payment.status !== "partially_refunded")
      return { error: "Only successful payments can be refunded." } as const;
    if (!payment.providerPaymentId) return { error: "This payment has no provider transaction yet." } as const;
    const net = payment.amountInCents - payment.refundedAmountInCents;
    if (!Number.isSafeInteger(input.amountInCents) || input.amountInCents <= 0 || input.amountInCents > net)
      return { error: "Refund amount cannot exceed the remaining paid amount." } as const;

    const [connection] = await tx
      .select()
      .from(paymentProviderConnections)
      .where(
        and(
          eq(paymentProviderConnections.id, payment.providerConnectionId ?? ""),
          eq(paymentProviderConnections.businessId, input.businessId),
        ),
      )
      .limit(1);
    if (!connection) return { error: "Payment provider connection not found." } as const;
    const blocked = providerOperationBlocked(connection);
    if (blocked) return { error: blocked } as const;

    const idempotencyKey = createId("ref");
    const metadata = (payment.metadata ?? {}) as Record<string, unknown>;
    const attempts = Array.isArray(metadata.refund_attempts) ? metadata.refund_attempts : [];
    await tx
      .update(payments)
      .set({
        metadata: {
          ...metadata,
          refund_attempts: [...attempts, { key: idempotencyKey, amountInCents: input.amountInCents, createdAt: new Date().toISOString(), actorUserId: input.actorUserId }],
        },
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    const adapter = input.adapter ?? getPaymentAdapter(connection.provider);
    let credentials = input.credentials;
    if (!credentials) {
      const [row] = await tx
        .select({ ciphertext: paymentProviderConnections.credentialsCiphertext })
        .from(paymentProviderConnections)
        .where(eq(paymentProviderConnections.id, connection.id))
        .limit(1);
      if (!row) return { error: "Payment provider connection not found." } as const;
      credentials = JSON.parse(decryptSecret(row.ciphertext)) as ProviderCredentials;
    }

    try {
      const result = await adapter.refundPayment({
        credentials,
        environment: connection.environment,
        providerPaymentId: payment.providerPaymentId,
        amountInCents: input.amountInCents,
        idempotencyKey,
      });
      if (!result.accepted) return { error: "The provider did not accept the refund." } as const;
      return { providerRefundId: result.providerRefundId ?? idempotencyKey, idempotencyKey } as const;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Provider refund failed.";
      return { error: `${message} The refund attempt was recorded; check the provider dashboard before retrying.` } as const;
    }
  });
}

export const CONNECTION_ATTEMPT_TTL_MINUTES = 30;

function hashStateToken(state: string): string {
  return createHash("sha256").update(state, "utf8").digest("hex");
}

function safeEqualToken(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * Connection attempts bind a provider-hosted flow to (user, business,
 * provider, environment, account) with a 30-minute expiry. The attempt id —
 * unguessable, single-use, carrying no secrets — travels in the provider's
 * return/refresh URLs as a pointer. Authentication always comes from the
 * Requo session matching the bound user plus an owner-role check, never
 * from the URL. `stateTokenHash` tamper-binds each row to its own id.
 */
export async function createConnectionAttempt(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: {
    businessId: string;
    userId: string;
    provider: PaymentProvider;
    environment: ProviderEnvironment;
    providerAccountId?: string | null;
    now: Date;
  },
): Promise<{ id: string; expiresAt: Date }> {
  const expiresAt = new Date(input.now.getTime() + CONNECTION_ATTEMPT_TTL_MINUTES * 60 * 1000);
  const id = createId("pat");
  await tx
    .delete(providerConnectionAttempts)
    .where(
      and(
        eq(providerConnectionAttempts.businessId, input.businessId),
        sql`${providerConnectionAttempts.expiresAt} < ${input.now}`,
      ),
    );
  await tx.insert(providerConnectionAttempts).values({
    id,
    businessId: input.businessId,
    userId: input.userId,
    provider: input.provider,
    environment: input.environment,
    providerAccountId: input.providerAccountId ?? null,
    stateTokenHash: hashStateToken(id),
    expiresAt,
    createdAt: input.now,
  });
  return { id, expiresAt };
}

export async function findConnectionAttempt(input: { attemptId: string; userId: string }) {
  if (!input.attemptId) return null;
  const [row] = await db
    .select()
    .from(providerConnectionAttempts)
    .where(
      and(
        eq(providerConnectionAttempts.id, input.attemptId),
        sql`${providerConnectionAttempts.expiresAt} > now()`,
      ),
    )
    .limit(1);
  if (!row || row.userId !== input.userId) return null;
  if (!safeEqualToken(row.stateTokenHash, hashStateToken(row.id))) return null;
  return row;
}

/** One-time consume: deletes the attempt so callbacks cannot replay. */
export async function consumeConnectionAttempt(input: { attemptId: string; userId: string }) {
  const row = await findConnectionAttempt(input);
  if (!row) return null;
  await db.delete(providerConnectionAttempts).where(eq(providerConnectionAttempts.id, row.id));
  return row;
}

export async function startStripePlatformConnection(input: {
  businessId: string;
  actorUserId: string;
  actorEmail?: string | null;
  environment: ProviderEnvironment;
  returnUrl: string;
  refreshUrl: string;
  fetchImpl?: StripeFetch;
}): Promise<{ url: string; connectionId: string } | { error: string }> {
  const platform = getStripePlatformConfig();
  if (!platform) return { error: "Stripe platform is not configured." } as const;

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(paymentProviderConnections)
      .where(
        and(
          eq(paymentProviderConnections.businessId, input.businessId),
          eq(paymentProviderConnections.provider, "stripe"),
          eq(paymentProviderConnections.environment, input.environment),
        ),
      )
      .limit(1);
    if (existing && existing.authMode !== "platform")
      return { error: "Disconnect the existing Stripe connection first." } as const;

    let accountId = existing?.providerAccountId ?? null;
    if (!accountId) {
      try {
        ({ accountId } = await createConnectedAccount({
          platformSecretKey: platform.secretKey,
          email: input.actorEmail ?? undefined,
          fetchImpl: input.fetchImpl,
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Stripe account creation failed.";
        return { error: message } as const;
      }
    } else if (existing && existing.status === "ready") {
      return { error: "This business already has a connected Stripe account." } as const;
    }

    const now = new Date();
    const hint = `••••${accountId.replace(/[^A-Za-z0-9]/g, "").slice(-4)}`;
    let connectionId: string;
    if (existing) {
      connectionId = existing.id;
      await tx
        .update(paymentProviderConnections)
        .set({
          providerAccountId: accountId,
          status: "onboarding",
          authMode: "platform",
          credentialsCiphertext: encryptSecret(JSON.stringify({ providerAccountId: accountId })),
          publicHint: hint,
          updatedAt: now,
        })
        .where(eq(paymentProviderConnections.id, existing.id));
    } else {
      connectionId = createId("ppc");
      await tx.insert(paymentProviderConnections).values({
        id: connectionId,
        businessId: input.businessId,
        provider: "stripe",
        environment: input.environment,
        credentialsCiphertext: encryptSecret(JSON.stringify({ providerAccountId: accountId })),
        publicHint: hint,
        providerAccountId: accountId,
        status: "onboarding",
        authMode: "platform",
        createdAt: now,
        updatedAt: now,
      });
    }

    // The attempt is created before the link so its id can travel in Stripe's
    // return/refresh URLs as a pointer. Authentication comes from the Requo
    // session matching the bound user + owner role — never from the URL.
    const { id: attemptId } = await createConnectionAttempt(tx, {
      businessId: input.businessId,
      userId: input.actorUserId,
      provider: "stripe",
      environment: input.environment,
      providerAccountId: accountId,
      now,
    });
    const withAttempt = (url: string) =>
      `${url}${url.includes("?") ? "&" : "?"}attempt=${encodeURIComponent(attemptId)}`;

    let link: { url: string };
    try {
      link = await createAccountLink({
        platformSecretKey: platform.secretKey,
        accountId,
        returnUrl: withAttempt(input.returnUrl),
        refreshUrl: withAttempt(input.refreshUrl),
        fetchImpl: input.fetchImpl,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Stripe onboarding link failed.";
      return { error: message } as const;
    }
    return { url: link.url, connectionId } as const;
  });
}

export function attemptCallbackUrl(base: string, attemptId: string): string {
  return `${base}${base.includes("?") ? "&" : "?"}attempt=${encodeURIComponent(attemptId)}`;
}

async function requireConnectionOwner(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: { businessId: string; userId: string },
): Promise<boolean> {
  const [membership] = await tx
    .select({ role: businessMembers.role })
    .from(businessMembers)
    .where(
      and(
        eq(businessMembers.businessId, input.businessId),
        eq(businessMembers.userId, input.userId),
      ),
    )
    .limit(1);
  return membership?.role === "owner";
}

export async function completeStripePlatformConnection(input: {
  attemptId: string;
  userId: string;
  fetchImpl?: StripeFetch;
}): Promise<
  | { businessId: string; businessSlug: string; connectionId: string; status: "ready" | "action_required" }
  | { error: string; businessSlug?: string }
> {
  const attempt = await consumeConnectionAttempt({ attemptId: input.attemptId, userId: input.userId });
  if (!attempt) return { error: "This connection link is invalid or expired." } as const;

  const platform = getStripePlatformConfig();
  if (!platform) return { error: "Stripe platform is not configured." } as const;

  const [business] = await db
    .select({ id: businesses.id, slug: businesses.slug })
    .from(businesses)
    .where(eq(businesses.id, attempt.businessId))
    .limit(1);
  const businessSlug = business?.slug ?? "";

  return db.transaction(async (tx) => {
    if (!(await requireConnectionOwner(tx, { businessId: attempt.businessId, userId: input.userId })))
      return { error: "Only the business owner can connect payment accounts.", businessSlug } as const;

    const [connection] = await tx
      .select()
      .from(paymentProviderConnections)
      .where(
        and(
          eq(paymentProviderConnections.businessId, attempt.businessId),
          eq(paymentProviderConnections.provider, attempt.provider),
          eq(paymentProviderConnections.environment, attempt.environment),
        ),
      )
      .limit(1);
    if (!connection || connection.authMode !== "platform")
      return { error: "No matching platform connection found.", businessSlug } as const;
    if (connection.providerAccountId !== attempt.providerAccountId)
      return { error: "This link belongs to a different Stripe account.", businessSlug } as const;

    let capability;
    try {
      const account = await retrieveConnectedAccount({
        platformSecretKey: platform.secretKey,
        accountId: attempt.providerAccountId ?? connection.providerAccountId ?? "",
        fetchImpl: input.fetchImpl,
      });
      capability = readinessFromAccount(account);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Stripe account verification failed.";
      return { error: message, businessSlug } as const;
    }

    const now = new Date();
    const status = connectionStatusForCapability(capability);
    await tx
      .update(paymentProviderConnections)
      .set({ status, updatedAt: now })
      .where(eq(paymentProviderConnections.id, connection.id));
    await writeAuditLog(tx, {
      businessId: attempt.businessId,
      actorUserId: input.userId,
      entityType: "connection",
      entityId: connection.id,
      action: connection.status === "onboarding" ? "connection.connected" : "connection.updated",
      metadata: {
        provider: attempt.provider,
        environment: attempt.environment,
        status,
        paymentsReady: capability.paymentsReady,
        refundsReady: capability.refundsReady,
      },
      createdAt: now,
    });
    return {
      businessId: attempt.businessId,
      businessSlug,
      connectionId: connection.id,
      status,
    } as const;
  });
}

export async function refreshStripePlatformLink(input: {
  attemptId: string;
  userId: string;
  returnUrl: string;
  refreshUrl: string;
  fetchImpl?: StripeFetch;
}): Promise<{ url: string } | { error: string }> {
  const attempt = await findConnectionAttempt({ attemptId: input.attemptId, userId: input.userId });
  if (!attempt || attempt.provider !== "stripe" || !attempt.providerAccountId)
    return { error: "This connection link is invalid or expired." } as const;

  const platform = getStripePlatformConfig();
  if (!platform) return { error: "Stripe platform is not configured." } as const;

  try {
    const link = await createAccountLink({
      platformSecretKey: platform.secretKey,
      accountId: attempt.providerAccountId,
      returnUrl: attemptCallbackUrl(input.returnUrl, attempt.id),
      refreshUrl: attemptCallbackUrl(input.refreshUrl, attempt.id),
      fetchImpl: input.fetchImpl,
    });
    return { url: link.url } as const;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe onboarding link failed.";
    return { error: message } as const;
  }
}

export async function readProviderCredentials(input: {
  businessId: string;
  connectionId: string;
}): Promise<Record<string, string> | null> {
  const [row] = await db
    .select({
      id: paymentProviderConnections.id,
      ciphertext: paymentProviderConnections.credentialsCiphertext,
    })
    .from(paymentProviderConnections)
    .where(
      and(
        eq(paymentProviderConnections.id, input.connectionId),
        eq(paymentProviderConnections.businessId, input.businessId),
      ),
    )
    .limit(1);
  if (!row) return null;
  return JSON.parse(decryptSecret(row.ciphertext)) as Record<string, string>;
}
