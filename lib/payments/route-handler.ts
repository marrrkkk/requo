import "server-only";

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { readProviderCredentials } from "@/features/payment-providers/mutations";
import { db } from "@/lib/db/client";
import { paymentEvents, paymentProviderConnections } from "@/lib/db/schema";
import { getPaymentAdapter } from "@/lib/payments/adapters";
import { PAYMENT_WEBHOOK_MAX_BODY_BYTES } from "@/lib/payments/constants";
import { insertPaymentEvent } from "@/lib/payments/reconciliation";
import { inngest } from "@/lib/inngest/client";
import { inngestEvents } from "@/lib/inngest/events";
import type { PaymentProvider } from "@/lib/payments/types";

/**
 * Shared provider webhook ingestion: verify → persist → enqueue → fast 2xx.
 * Full reconciliation runs asynchronously in the Inngest worker (Q11).
 */
export async function handlePaymentWebhook(
  request: Request,
  input: { provider: PaymentProvider; connectionId: string },
): Promise<Response> {
  const [connection] = await db
    .select()
    .from(paymentProviderConnections)
    .where(
      and(
        eq(paymentProviderConnections.id, input.connectionId),
        eq(paymentProviderConnections.provider, input.provider),
      ),
    )
    .limit(1);
  if (!connection) return NextResponse.json({ error: "Unknown webhook endpoint." }, { status: 404 });

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isSafeInteger(contentLength) && contentLength > PAYMENT_WEBHOOK_MAX_BODY_BYTES)
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > PAYMENT_WEBHOOK_MAX_BODY_BYTES)
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });

  const credentials = await readProviderCredentials({
    businessId: connection.businessId,
    connectionId: connection.id,
  });
  if (!credentials) return NextResponse.json({ error: "Unknown webhook endpoint." }, { status: 404 });

  const adapter = getPaymentAdapter(input.provider);
  const verification = await adapter.verifyWebhook({
    rawBody,
    headers: request.headers,
    credentials,
    environment: connection.environment,
  });
  if (!verification.ok) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    const { eventId } = await insertPaymentEvent({
      connectionId: connection.id,
      businessId: connection.businessId,
      provider: input.provider,
      providerEventId: `malformed:${randomUUID()}`,
      payload: { raw: rawBody.slice(0, 4000) },
    });
    await db
      .update(paymentEvents)
      .set({ status: "failed", error: "malformed_json", processedAt: new Date() })
      .where(eq(paymentEvents.id, eventId));
    return NextResponse.json({ ok: true });
  }

  const normalized = adapter.parseWebhook(payload, connection.environment);
  if (!normalized.snapshot) {
    const { eventId } = await insertPaymentEvent({
      connectionId: connection.id,
      businessId: connection.businessId,
      provider: input.provider,
      providerEventId: normalized.providerEventId,
      payload,
    });
    await db
      .update(paymentEvents)
      .set({ status: "ignored", processedAt: new Date() })
      .where(eq(paymentEvents.id, eventId));
    return NextResponse.json({ ok: true });
  }
  if (normalized.snapshot.environment !== connection.environment) {
    const { eventId } = await insertPaymentEvent({
      connectionId: connection.id,
      businessId: connection.businessId,
      provider: input.provider,
      providerEventId: normalized.providerEventId,
      payload,
    });
    await db
      .update(paymentEvents)
      .set({ status: "failed", error: "environment_mismatch", processedAt: new Date() })
      .where(eq(paymentEvents.id, eventId));
    return NextResponse.json({ ok: true });
  }
  const { inserted, eventId } = await insertPaymentEvent({
    connectionId: connection.id,
    businessId: connection.businessId,
    provider: input.provider,
    providerEventId: normalized.providerEventId,
    payload,
  });
  if (!inserted) return NextResponse.json({ ok: true, duplicate: true });

  try {
    await inngest.send({ name: inngestEvents.paymentEventReceived, data: { eventId } });
  } catch (error) {
    console.error("Failed to enqueue provider payment event.", error);
    return NextResponse.json({ error: "Retry later." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
