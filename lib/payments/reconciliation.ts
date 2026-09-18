import "server-only";

import { revalidateTag } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";

import { insertBusinessNotification } from "@/features/notifications/mutations";
import { calculateInvoicePaymentState } from "@/features/invoices/utils";
import {
  getBusinessInvoiceDetailCacheTags,
  getBusinessInvoiceListCacheTags,
} from "@/lib/cache/business-tags";
import { db } from "@/lib/db/client";
import {
  activityLogs,
  businesses,
  invoices,
  paymentEvents,
  paymentProviderConnections,
  payments,
} from "@/lib/db/schema";
import type { InvoiceStatus } from "@/lib/db/schema/invoices";
import { inngest } from "@/lib/inngest/client";
import { inngestEvents } from "@/lib/inngest/events";
import { sendPushInvoicePaidEvent } from "@/lib/inngest/send";
import { prefixedId as createId } from "@/lib/ids";
import { readProviderCredentials } from "@/features/payment-providers/mutations";
import { getPaymentAdapter } from "@/lib/payments/adapters";
import { PAYMENT_EVENT_STALE_AFTER_MINUTES } from "@/lib/payments/constants";
import {
  clampRefundedAmount,
  deriveEffectiveStatus,
  isSucceededFamilyStatus,
  isValidPaymentTransition,
} from "@/lib/payments/payment-state";
import type {
  NormalizedWebhook,
  PaymentProviderAdapter,
  PaymentStatus,
  ProviderCredentials,
  ProviderPaymentSnapshot,
} from "@/lib/payments/types";

export type ReconcileFailureReason =
  | "unknown_connection"
  | "unknown_event_type"
  | "provider_mismatch"
  | "environment_mismatch"
  | "connection_mismatch"
  | "business_mismatch"
  | "unknown_invoice"
  | "invoice_not_payable"
  | "currency_mismatch"
  | "invalid_amount"
  | "payment_invoice_conflict"
  | "payment_not_found"
  | "connection_not_ready"
  | "account_mismatch"
  | "amount_mismatch";

export type ReconcileResult =
  | {
      ok: true;
      paymentId: string;
      invoiceStatus: InvoiceStatus;
      paidTransition: boolean;
      stateChanged: boolean;
    }
  | { ok: true; ignored: true }
  | { ok: false; reason: ReconcileFailureReason };

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const REDACTED = "[redacted]";
const SENSITIVE_KEYS = new Set(
  [
    "apikey",
    "api_key",
    "secret",
    "secretkey",
    "secret_key",
    "webhooksecret",
    "webhook_secret",
    "clientsecret",
    "client_secret",
    "authorization",
    "cardnumber",
    "card_number",
    "pan",
    "cvv",
    "cvc",
    "password",
  ].map((k) => k.toLowerCase()),
);

export function sanitizeWebhookPayload(payload: unknown, depth = 0): unknown {
  if (depth > 20) return REDACTED;
  if (Array.isArray(payload)) return payload.map((v) => sanitizeWebhookPayload(v, depth + 1));
  if (payload !== null && typeof payload === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEYS.has(key.toLowerCase())
        ? REDACTED
        : sanitizeWebhookPayload(value, depth + 1);
    }
    return out;
  }
  return payload;
}

export async function insertPaymentEvent(input: {
  connectionId: string;
  businessId: string;
  provider: (typeof paymentEvents.$inferInsert)["provider"];
  providerEventId: string;
  payload: unknown;
}): Promise<{ inserted: boolean; eventId: string }> {
  const id = createId("pev");
  const inserted = await db
    .insert(paymentEvents)
    .values({
      id,
      connectionId: input.connectionId,
      businessId: input.businessId,
      provider: input.provider,
      providerEventId: input.providerEventId,
      status: "processing",
      payload: sanitizeWebhookPayload(input.payload) as Record<string, unknown>,
      createdAt: new Date(),
    })
    .onConflictDoNothing({
      target: [paymentEvents.connectionId, paymentEvents.providerEventId],
    })
    .returning({ id: paymentEvents.id });
  if (inserted.length > 0) return { inserted: true, eventId: inserted[0].id };
  const [existing] = await db
    .select({ id: paymentEvents.id })
    .from(paymentEvents)
    .where(
      and(
        eq(paymentEvents.connectionId, input.connectionId),
        eq(paymentEvents.providerEventId, input.providerEventId),
      ),
    )
    .limit(1);
  return { inserted: false, eventId: existing?.id ?? id };
}

async function markPaymentEvent(
  tx: Tx,
  eventId: string,
  status: "processed" | "failed" | "ignored",
  error?: string,
): Promise<void> {
  await tx
    .update(paymentEvents)
    .set({ status, error: error ?? null, processedAt: new Date() })
    .where(eq(paymentEvents.id, eventId));
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Webhook payloads round-trip through JSONB, so Dates arrive as strings. */
function toDateOrNull(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function netOf(row: { amountInCents: number; refundedAmountInCents: number }): number {
  return row.amountInCents - row.refundedAmountInCents;
}

async function findPaymentByProviderIds(
  tx: Tx,
  input: {
    businessId: string;
    provider: ProviderPaymentSnapshot["provider"];
    providerPaymentId?: string;
    connectionId: string;
    providerCheckoutId?: string;
  },
) {
  if (input.providerPaymentId) {
    const [byPayment] = await tx
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.businessId, input.businessId),
          eq(payments.provider, input.provider),
          eq(payments.providerPaymentId, input.providerPaymentId),
        ),
      )
      .limit(1);
    if (byPayment) return byPayment;
  }
  if (input.providerCheckoutId) {
    const [byCheckout] = await tx
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.businessId, input.businessId),
          eq(payments.providerConnectionId, input.connectionId),
          eq(payments.providerCheckoutId, input.providerCheckoutId),
        ),
      )
      .limit(1);
    if (byCheckout) return byCheckout;
  }
  return null;
}

async function fail(
  tx: Tx | null,
  eventId: string | null,
  reason: ReconcileFailureReason,
  opts?: { leaveProcessing?: boolean },
): Promise<{ ok: false; reason: ReconcileFailureReason }> {
  // leaveProcessing keeps the event retryable via the stale-event sweep
  // (used when a refund arrives before its payment row exists).
  if (!opts?.leaveProcessing) {
    if (tx && eventId) await markPaymentEvent(tx, eventId, "failed", reason);
    else if (eventId) {
      await db
        .update(paymentEvents)
        .set({ status: "failed", error: reason, processedAt: new Date() })
        .where(eq(paymentEvents.id, eventId));
    }
  }
  return { ok: false, reason };
}

function appliedRefundIds(metadata: unknown): string[] {
  const record = metadata !== null && typeof metadata === "object" ? (metadata as Record<string, unknown>) : {};
  const list = record.applied_refunds;
  if (!Array.isArray(list)) return [];
  return list.filter((id): id is string => typeof id === "string");
}

export async function reconcileNormalizedEvent(input: {
  eventId?: string | null;
  normalized: NormalizedWebhook;
  connectionId: string;
  actorUserId: string | null;
  isRefresh?: boolean;
  trustRefundDecrease?: boolean;
}): Promise<ReconcileResult> {
  const eventId = input.eventId ?? null;
  const { normalized, connectionId, actorUserId } = input;

  const [connection] = await db
    .select()
    .from(paymentProviderConnections)
    .where(eq(paymentProviderConnections.id, connectionId))
    .limit(1);
  if (!connection) return fail(null, eventId, "unknown_connection");

  if (!normalized.snapshot) {
    if (eventId) {
      await db
        .update(paymentEvents)
        .set({ status: "ignored", processedAt: new Date() })
        .where(eq(paymentEvents.id, eventId));
    }
    return { ok: true, ignored: true };
  }

  const snapshot = normalized.snapshot;
  if (snapshot.provider !== connection.provider) return fail(null, eventId, "provider_mismatch");
  if (snapshot.environment !== connection.environment) return fail(null, eventId, "environment_mismatch");
  if (snapshot.connectionId && snapshot.connectionId !== connection.id)
    return fail(null, eventId, "connection_mismatch");
  // Platform mode (Stripe Connect): the event's connected account must match
  // the stored account when both exist. Absent either side, the
  // connection-specific URL binding remains the identity boundary.
  if (
    snapshot.providerAccountId &&
    connection.providerAccountId &&
    snapshot.providerAccountId !== connection.providerAccountId
  )
    return fail(null, eventId, "account_mismatch");
  if (snapshot.businessId && snapshot.businessId !== connection.businessId)
    return fail(null, eventId, "business_mismatch");
  // Incremental refund snapshots carry no gross amount (PayPal refund objects
  // describe one refund, not the capture). They resolve against the stored row.
  if (
    snapshot.incrementalRefundAmountInCents === undefined &&
    (!Number.isSafeInteger(snapshot.amountInCents) || snapshot.amountInCents <= 0)
  )
    return fail(null, eventId, "invalid_amount");

  let settledInvoice: { id: string; invoiceNumber: string; customerName: string } | null = null;

  return db.transaction(async (tx) => {
    let invoiceId = snapshot.invoiceId;
    if (!invoiceId) {
      const fallback = await findPaymentByProviderIds(tx, {
        businessId: connection.businessId,
        provider: snapshot.provider,
        providerPaymentId: snapshot.providerPaymentId,
        connectionId: connection.id,
        providerCheckoutId: snapshot.providerCheckoutId,
      });
      if (!fallback) return fail(tx, eventId, "unknown_invoice");
      invoiceId = fallback.invoiceId;
    }

    const [invoice] = await tx
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.id, invoiceId),
          eq(invoices.businessId, connection.businessId),
          isNull(invoices.deletedAt),
        ),
      )
      .for("update");
    if (!invoice) return fail(tx, eventId, "unknown_invoice");
    if (invoice.status === "draft" || invoice.status === "voided")
      return fail(tx, eventId, "invoice_not_payable");
    if (
      (snapshot.currency ?? "").toUpperCase() !== (invoice.currency ?? "").toUpperCase()
    )
      return fail(tx, eventId, "currency_mismatch");

    const existing = await findPaymentByProviderIds(tx, {
      businessId: connection.businessId,
      provider: snapshot.provider,
      providerPaymentId: snapshot.providerPaymentId,
      connectionId: connection.id,
      providerCheckoutId: snapshot.providerCheckoutId,
    });
    if (existing && existing.invoiceId !== invoice.id)
      return fail(tx, eventId, "payment_invoice_conflict");
    // Incremental refund snapshots carry no gross amount (PayPal), so only
    // cumulative snapshots participate in the amount check.
    if (
      existing &&
      snapshot.incrementalRefundAmountInCents === undefined &&
      existing.amountInCents !== snapshot.amountInCents
    )
      return fail(tx, eventId, "amount_mismatch");

    const incomingRefunded = clampRefundedAmount(
      snapshot.amountInCents,
      snapshot.refundedAmountInCents,
    );
    const incremental = snapshot.incrementalRefundAmountInCents;
    const refundId = snapshot.providerRefundId;
    const previouslyApplied = appliedRefundIds(existing?.metadata);
    let nextRefunded: number;
    let newlyAppliedRefundId: string | null = null;
    if (incremental !== undefined && refundId) {
      // Individual-refund providers (PayPal): accumulate per refund id.
      if (!existing) return fail(tx, eventId, "payment_not_found", { leaveProcessing: true });
      if (previouslyApplied.includes(refundId)) {
        nextRefunded = existing.refundedAmountInCents;
      } else {
        nextRefunded = clampRefundedAmount(
          existing.amountInCents,
          existing.refundedAmountInCents + Math.max(0, incremental),
        );
        newlyAppliedRefundId = refundId;
      }
    } else {
      nextRefunded =
        existing && !input.trustRefundDecrease
          ? Math.max(existing.refundedAmountInCents, incomingRefunded)
          : incomingRefunded;
    }
    const baseStatus: PaymentStatus = snapshot.status;
    const effectiveStatus = deriveEffectiveStatus(
      baseStatus,
      existing?.amountInCents ?? snapshot.amountInCents,
      nextRefunded,
    );

    const now = new Date();
    let paymentId: string;
    let stateChanged = false;
    let oldNet = 0;

    if (!existing) {
      paymentId = createId("pay");
      const occurredAt = toDateOrNull(snapshot.occurredAt);
      const paidAt =
        isSucceededFamilyStatus(effectiveStatus) ? (occurredAt ?? now) : null;
      await tx.insert(payments).values({
        id: paymentId,
        businessId: connection.businessId,
        invoiceId: invoice.id,
        amountInCents: snapshot.amountInCents,
        paymentDate: occurredAt ? occurredAt.toISOString().slice(0, 10) : todayUtc(),
        method: "other",
        reference: snapshot.providerPaymentId ?? snapshot.providerCheckoutId ?? null,
        notes: null,
        createdBy: actorUserId,
        source: "provider",
        provider: snapshot.provider,
        providerConnectionId: connection.id,
        providerCheckoutId: snapshot.providerCheckoutId ?? null,
        providerPaymentId: snapshot.providerPaymentId ?? null,
        status: effectiveStatus,
        refundedAmountInCents: nextRefunded,
        paidAt,
        checkoutUrl: null,
        metadata: { provider: snapshot.provider, environment: snapshot.environment },
        createdAt: now,
        updatedAt: now,
      });
      stateChanged = true;
    } else {
      paymentId = existing.id;
      oldNet = netOf(existing);
      // Webhook snapshots are triggers: never move backward. Refresh snapshots
      // are authoritative provider truth and may correct a stale refund (Q14).
      if (
        !input.trustRefundDecrease &&
        !isValidPaymentTransition(existing.status ?? "pending", effectiveStatus)
      ) {
        const patch: Partial<typeof payments.$inferInsert> = { updatedAt: now };
        if (!existing.providerPaymentId && snapshot.providerPaymentId)
          patch.providerPaymentId = snapshot.providerPaymentId;
        if (!existing.providerCheckoutId && snapshot.providerCheckoutId)
          patch.providerCheckoutId = snapshot.providerCheckoutId;
        if (patch.providerPaymentId || patch.providerCheckoutId)
          await tx.update(payments).set(patch).where(eq(payments.id, existing.id));
        if (eventId) await markPaymentEvent(tx, eventId, "processed");
        return {
          ok: true as const,
          paymentId,
          invoiceStatus: invoice.status as InvoiceStatus,
          paidTransition: false,
          stateChanged: false,
        };
      }
      const paidAt =
        existing.paidAt ??
        (isSucceededFamilyStatus(effectiveStatus)
          ? (toDateOrNull(snapshot.occurredAt) ?? now)
          : null);
      const existingMeta =
        existing.metadata !== null && typeof existing.metadata === "object"
          ? (existing.metadata as Record<string, unknown>)
          : {};
      try {
        await tx
          .update(payments)
          .set({
            providerPaymentId: snapshot.providerPaymentId ?? existing.providerPaymentId,
            providerCheckoutId: snapshot.providerCheckoutId ?? existing.providerCheckoutId,
            status: effectiveStatus,
            refundedAmountInCents: nextRefunded,
            paidAt,
            ...(newlyAppliedRefundId
              ? {
                  metadata: {
                    ...existingMeta,
                    applied_refunds: [...previouslyApplied, newlyAppliedRefundId].slice(-100),
                  },
                }
              : {}),
            updatedAt: now,
          })
          .where(eq(payments.id, existing.id));
      } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
          const [reread] = await tx.select().from(payments).where(eq(payments.id, existing.id)).limit(1);
          if (!reread || reread.status !== effectiveStatus || reread.refundedAmountInCents !== nextRefunded) throw error;
        } else throw error;
      }
      stateChanged =
        existing.status !== effectiveStatus ||
        existing.refundedAmountInCents !== nextRefunded;
    }

    const rows = await tx
      .select({
        amountInCents: payments.amountInCents,
        refundedAmountInCents: payments.refundedAmountInCents,
        source: payments.source,
        status: payments.status,
        voidedAt: payments.voidedAt,
      })
      .from(payments)
      .where(
        and(eq(payments.invoiceId, invoice.id), eq(payments.businessId, connection.businessId)),
      );
    const netPaid = rows.reduce((sum, row) => {
      if (row.voidedAt) return sum;
      if (row.source === "provider" && !(row.status === "succeeded" || row.status === "partially_refunded" || row.status === "refunded"))
        return sum;
      return sum + (row.amountInCents - row.refundedAmountInCents);
    }, 0);
    const next = calculateInvoicePaymentState({
      totalInCents: invoice.totalInCents,
      paidInCents: netPaid,
      dueDate: invoice.dueDate,
      lifecycleStatus: invoice.status as InvoiceStatus,
    });
    if (next.status !== invoice.status) {
      await tx
        .update(invoices)
        .set({ status: next.status, updatedAt: now })
        .where(eq(invoices.id, invoice.id));
    }

    const paidTransition = invoice.status !== "paid" && next.status === "paid";

    const oldCounted =
      existing && isSucceededFamilyStatus(existing.status ?? "pending") ? oldNet : 0;
    const newCounted = isSucceededFamilyStatus(effectiveStatus)
      ? (existing?.amountInCents ?? snapshot.amountInCents) - nextRefunded
      : 0;
    const moneyDelta = newCounted - oldCounted;
    if (moneyDelta > 0) {
      await tx.insert(activityLogs).values({
        id: createId("act"),
        businessId: connection.businessId,
        actorUserId,
        type: "invoice.payment_recorded",
        summary: `Provider payment recorded on ${invoice.invoiceNumber}.`,
        metadata: {
          invoiceId: invoice.id,
          paymentId,
          amountInCents: moneyDelta,
          provider: snapshot.provider,
          status: effectiveStatus,
        },
        createdAt: now,
        updatedAt: now,
      });
    }
    if (existing && nextRefunded > existing.refundedAmountInCents) {
      await tx.insert(activityLogs).values({
        id: createId("act"),
        businessId: connection.businessId,
        actorUserId,
        type: "payment.refunded",
        summary: `Provider payment refunded on ${invoice.invoiceNumber}.`,
        metadata: {
          invoiceId: invoice.id,
          paymentId,
          refundedAmountInCents: nextRefunded,
          netPaidInCents: netPaid,
          provider: snapshot.provider,
        },
        createdAt: now,
        updatedAt: now,
      });
    }
    if (input.isRefresh) {
      await tx.insert(activityLogs).values({
        id: createId("act"),
        businessId: connection.businessId,
        actorUserId,
        type: "payment.refreshed",
        summary: `Provider payment refreshed on ${invoice.invoiceNumber}.`,
        metadata: {
          invoiceId: invoice.id,
          paymentId,
          before: existing
            ? { status: existing.status, refundedAmountInCents: existing.refundedAmountInCents }
            : null,
          after: { status: effectiveStatus, refundedAmountInCents: nextRefunded },
          provider: snapshot.provider,
        },
        createdAt: now,
        updatedAt: now,
      });
    }
    if (paidTransition) {
      await tx.insert(activityLogs).values({
        id: createId("act"),
        businessId: connection.businessId,
        actorUserId,
        type: "invoice.paid",
        summary: `Invoice ${invoice.invoiceNumber} is paid in full.`,
        metadata: { invoiceNumber: invoice.invoiceNumber },
        createdAt: now,
        updatedAt: now,
      });
      await insertBusinessNotification(tx, {
        businessId: connection.businessId,
        invoiceId: invoice.id,
        type: "invoice_paid",
        title: `Invoice ${invoice.invoiceNumber} is paid`,
        summary: `${invoice.customerName} paid ${invoice.invoiceNumber} in full.`,
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerName,
          amountInCents: invoice.totalInCents,
        },
        now,
      });
    }

    if (eventId) await markPaymentEvent(tx, eventId, "processed");

    settledInvoice = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
    };
    return {
      ok: true as const,
      paymentId,
      invoiceStatus: next.status,
      paidTransition,
      stateChanged,
    };
  }).then(async (result) => {
    if (!result.ok || "ignored" in result) return result;
    if (result.paidTransition && settledInvoice) {
      const [business] = await db
        .select({ slug: businesses.slug })
        .from(businesses)
        .where(eq(businesses.id, connection.businessId))
        .limit(1);
      if (business) {
        void sendPushInvoicePaidEvent({
          businessId: connection.businessId,
          businessSlug: business.slug,
          invoiceId: settledInvoice.id,
          invoiceNumber: settledInvoice.invoiceNumber,
          customerName: settledInvoice.customerName,
        }).catch((error) => {
          console.error("Failed to queue push notification for provider-paid invoice.", error);
        });
      }
    }
    if ((result.paidTransition || result.stateChanged) && settledInvoice) {
      for (const tag of getBusinessInvoiceListCacheTags(connection.businessId))
        revalidateTag(tag, "max");
      for (const tag of getBusinessInvoiceDetailCacheTags(connection.businessId, settledInvoice.id))
        revalidateTag(tag, "max");
    }
    return result;
  });
}

async function fulfillCheckoutIfNeeded(input: {
  adapter: PaymentProviderAdapter;
  businessId: string;
  connectionId: string;
  environment: (typeof paymentProviderConnections.$inferSelect)["environment"];
  snapshot: ProviderPaymentSnapshot;
  idempotencyKey: string;
}): Promise<ReconcileResult | null> {
  const fulfill = input.adapter.fulfillCheckout;
  if (!fulfill || !input.snapshot) return null;
  if (input.snapshot.providerPaymentId || !input.snapshot.providerCheckoutId) return null;
  if (input.snapshot.status !== "processing") return null;
  let credentials: ProviderCredentials | null = null;
  try {
    credentials = await readProviderCredentials({
      businessId: input.businessId,
      connectionId: input.connectionId,
    });
    if (!credentials) return null;
    const fulfilled = await fulfill({
      credentials,
      environment: input.environment,
      snapshot: input.snapshot,
      idempotencyKey: input.idempotencyKey,
    });
    if (!fulfilled) return null;
    return reconcileNormalizedEvent({
      eventId: null,
      normalized: {
        providerEventId: `${input.idempotencyKey}:fulfilled`,
        rawType: "fulfill",
        snapshot: {
          ...fulfilled,
          businessId: input.businessId,
          connectionId: input.connectionId,
        },
        rawPayload: { fulfilled: true },
      },
      connectionId: input.connectionId,
      actorUserId: null,
    });
  } catch (error) {
    // The webhook event is already durable; fulfillment retries on redelivery,
    // the stale-event sweep, or manual refresh.
    console.error("Provider checkout fulfillment failed.", error);
    return null;
  }
}

export async function processStoredPaymentEvent(
  eventId: string,
  opts?: { actorUserId?: string | null; adapter?: PaymentProviderAdapter },
): Promise<ReconcileResult> {
  const [event] = await db
    .select()
    .from(paymentEvents)
    .where(eq(paymentEvents.id, eventId))
    .limit(1);
  if (!event) return { ok: false, reason: "unknown_connection" };
  const [connection] = await db
    .select()
    .from(paymentProviderConnections)
    .where(eq(paymentProviderConnections.id, event.connectionId))
    .limit(1);
  if (!connection) return { ok: false, reason: "unknown_connection" };
  const adapter = opts?.adapter ?? getPaymentAdapter(connection.provider);
  const normalized = adapter.parseWebhook(event.payload, connection.environment);
  const snapshot = normalized.snapshot
    ? { ...normalized.snapshot, connectionId: connection.id }
    : null;
  const result = await reconcileNormalizedEvent({
    eventId: event.id,
    normalized: { ...normalized, snapshot },
    connectionId: connection.id,
    actorUserId: opts?.actorUserId ?? null,
  });
  if (result.ok && !("ignored" in result) && snapshot) {
    const fulfilled = await fulfillCheckoutIfNeeded({
      adapter,
      businessId: connection.businessId,
      connectionId: connection.id,
      environment: connection.environment,
      snapshot,
      idempotencyKey: `fulfill:${event.id}`,
    });
    if (fulfilled && fulfilled.ok && !("ignored" in fulfilled) && fulfilled.paidTransition) return fulfilled;
  }
  return result;
}

export async function refreshProviderPayment(input: {
  businessId: string;
  actorUserId: string;
  connectionId: string;
  providerPaymentId: string;
  credentials?: ProviderCredentials;
  adapter?: PaymentProviderAdapter;
}): Promise<ReconcileResult> {
  const [connection] = await db
    .select()
    .from(paymentProviderConnections)
    .where(
      and(
        eq(paymentProviderConnections.id, input.connectionId),
        eq(paymentProviderConnections.businessId, input.businessId),
      ),
    )
    .limit(1);
  if (!connection) return { ok: false, reason: "unknown_connection" };
  // User-initiated refresh requires a ready connection. The async webhook
  // path deliberately has no such gate: in-flight money still reconciles
  // after a revocation.
  if (connection.status !== "ready") return { ok: false, reason: "connection_not_ready" };
  const adapter = input.adapter ?? getPaymentAdapter(connection.provider);
  const credentials =
    input.credentials ??
    (await readProviderCredentials({
      businessId: input.businessId,
      connectionId: connection.id,
    }));
  if (!credentials) return { ok: false, reason: "unknown_connection" };
  const snapshot = await adapter.getPayment({
    credentials,
    environment: connection.environment,
    providerPaymentId: input.providerPaymentId,
  });
  const withScope = {
    ...snapshot,
    businessId: input.businessId,
    connectionId: connection.id,
  };
  const result = await reconcileNormalizedEvent({
    eventId: null,
    normalized: {
      providerEventId: `refresh:${input.providerPaymentId}:${Date.now()}`,
      rawType: "refresh",
      snapshot: withScope,
      rawPayload: { refresh: true, providerPaymentId: input.providerPaymentId },
    },
    connectionId: connection.id,
    actorUserId: input.actorUserId,
    isRefresh: true,
    trustRefundDecrease: true,
  });
  if (result.ok && !("ignored" in result)) {
    const fulfilled = await fulfillCheckoutIfNeeded({
      adapter,
      businessId: input.businessId,
      connectionId: connection.id,
      environment: connection.environment,
      snapshot: withScope,
      idempotencyKey: `fulfill:refresh:${input.providerPaymentId}`,
    });
    if (fulfilled && fulfilled.ok && !("ignored" in fulfilled)) return fulfilled;
  }
  return result;
}

export async function findStaleProcessingPaymentEvents(
  limit = 50,
): Promise<Array<{ id: string }>> {
  return db
    .select({ id: paymentEvents.id })
    .from(paymentEvents)
    .where(
      and(
        eq(paymentEvents.status, "processing"),
        sql`${paymentEvents.createdAt} < now() - make_interval(mins => ${PAYMENT_EVENT_STALE_AFTER_MINUTES})`,
      ),
    )
    .limit(limit);
}

export async function resubmitStalePaymentEvents(
  sender: (eventId: string) => Promise<unknown> = (eventId) =>
    inngest.send({ name: inngestEvents.paymentEventReceived, data: { eventId } }),
  limit = 50,
): Promise<{ resubmitted: number; ids: string[] }> {
  const stale = await findStaleProcessingPaymentEvents(limit);
  for (const row of stale) {
    await sender(row.id);
  }
  return { resubmitted: stale.length, ids: stale.map((r) => r.id) };
}
