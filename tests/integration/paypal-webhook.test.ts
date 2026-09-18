import { createSign, generateKeyPairSync } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/inngest/client", () => ({
  inngest: { send: vi.fn(async () => undefined) },
}));

import { POST } from "@/app/api/payments/webhooks/paypal/[connectionId]/route";
import { inngest } from "@/lib/inngest/client";
import { encryptSecret } from "@/lib/payments/secret-box";
import { crc32UnsignedDecimal } from "@/lib/payments/providers/paypal/verify";
import { processStoredPaymentEvent } from "@/lib/payments/reconciliation";
import { createInvoiceForBusiness, markInvoiceSentForBusiness } from "@/features/invoices/mutations";
import {
  activityLogs,
  businessNotifications,
  invoiceLineItems,
  invoices,
  paymentEvents,
  paymentProviderConnections,
  payments,
} from "@/lib/db/schema";

import { closeTestDb, testDb } from "@/tests/support/db";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  type WorkflowFixtureIds,
} from "@/tests/support/fixtures/workflow";

const prefix = "test_paypal_wh";
const WEBHOOK_ID = "WH-TEST-CONN";
const CERT_URL = "https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-TEST";

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const CERT_PEM = publicKey.export({ type: "spki", format: "pem" }).toString();

let ids: WorkflowFixtureIds;
let connectionId: string;
let invoiceId: string;

const realFetch = globalThis.fetch;

function stubPaypalFetch(handler: (url: string, init: RequestInit) => unknown) {
  const stub = vi.fn(async (url: unknown, init?: RequestInit) => {
    const target = String(url);
    if (target === CERT_URL) {
      return {
        ok: true,
        status: 200,
        text: async () => CERT_PEM,
        json: async () => {
          throw new Error("no json");
        },
      } as unknown as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => handler(target, init ?? {}),
    } as unknown as Response;
  });
  (globalThis as Record<string, unknown>).fetch = stub;
  return stub;
}

function signHeaders(rawBody: string, time: string) {
  const transmissionId = `tx-${Math.random().toString(36).slice(2)}`;
  const crc = crc32UnsignedDecimal(rawBody);
  const signer = createSign("SHA256");
  signer.update(`${transmissionId}|${time}|${WEBHOOK_ID}|${crc}`, "utf8");
  const headers = new Headers({
    "content-type": "application/json",
    "paypal-transmission-id": transmissionId,
    "paypal-transmission-time": time,
    "paypal-cert-url": CERT_URL,
    "paypal-auth-algo": "SHA256withRSA",
    "paypal-transmission-sig": signer.sign(privateKey, "base64"),
  });
  return headers;
}

function approvedEvent() {
  return {
    id: "WH-APPR-1",
    event_type: "CHECKOUT.ORDER.APPROVED",
    create_time: "2026-06-10T12:00:00Z",
    resource_type: "checkout-order",
    resource: {
      id: "ORDER-ROUTE-1",
      status: "APPROVED",
      purchase_units: [
        {
          reference_id: "INV-ROUTE-P",
          custom_id: "placeholder-invoice",
          amount: { currency_code: "USD", value: "100.00" },
        },
      ],
    },
  };
}

async function postWebhook(rawBody: string, headers: Headers) {
  const request = new Request("https://app.example.com/api/payments/webhooks/paypal/x", {
    method: "POST",
    headers,
    body: rawBody,
  });
  return POST(request, { params: Promise.resolve({ connectionId }) });
}

async function cleanup() {
  const businessIds = [ids.businessId, ids.otherBusinessId, ids.archivedBusinessId];
  await testDb.delete(paymentEvents).where(inArray(paymentEvents.businessId, businessIds));
  await testDb.delete(payments).where(inArray(payments.businessId, businessIds));
  await testDb.delete(businessNotifications).where(inArray(businessNotifications.businessId, businessIds));
  await testDb.delete(activityLogs).where(inArray(activityLogs.businessId, businessIds));
  await testDb.delete(invoiceLineItems).where(inArray(invoiceLineItems.businessId, businessIds));
  await testDb.delete(invoices).where(inArray(invoices.businessId, businessIds));
}

describe("paypal webhook route", () => {
  vi.setConfig({ testTimeout: 120_000 });

  beforeAll(async () => {
    ids = await createWorkflowFixture(prefix);
    connectionId = `${prefix}_conn`;
    await testDb
      .insert(paymentProviderConnections)
      .values({
        id: connectionId,
        businessId: ids.businessId,
        provider: "paypal",
        environment: "test",
        credentialsCiphertext: encryptSecret(
          JSON.stringify({ clientId: "cid", clientSecret: "csec", webhookId: WEBHOOK_ID }),
        ),
        publicHint: "••••cid",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
  }, 60_000);

  beforeEach(async () => {
    vi.clearAllMocks();
    (globalThis as Record<string, unknown>).fetch = realFetch;
    await cleanup();
    const created = await createInvoiceForBusiness({
      businessId: ids.businessId,
      actorUserId: ids.ownerUserId,
      title: "Route invoice",
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      customerContactMethod: "email",
      customerContactHandle: "jane@example.com",
      currency: "USD",
      issueDate: "2026-06-01",
      dueDate: "2027-07-15",
      notes: null,
      paymentTerms: null,
      discountInCents: 0,
      taxInCents: 0,
      taxLabel: null,
      items: [{ description: "Work", quantity: 1, unitPriceInCents: 10000 }],
    });
    invoiceId = (created as { id: string }).id;
    await markInvoiceSentForBusiness({ businessId: ids.businessId, invoiceId, actorUserId: ids.ownerUserId });
  }, 60_000);

  afterAll(async () => {
    (globalThis as Record<string, unknown>).fetch = realFetch;
    await cleanup();
    await testDb.delete(paymentProviderConnections).where(eq(paymentProviderConnections.id, connectionId));
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 60_000);

  it("captures an approved order through the worker and pays the invoice", async () => {
    const event = approvedEvent();
    (event.resource.purchase_units[0] as Record<string, unknown>).custom_id = invoiceId;
    const rawBody = JSON.stringify(event);
    stubPaypalFetch((url) => {
      if (url.endsWith("/v1/oauth2/token")) return { access_token: "tok", expires_in: 3600 };
      if (url.endsWith("/v2/checkout/orders/ORDER-ROUTE-1/capture")) {
        return {
          id: "ORDER-ROUTE-1",
          status: "COMPLETED",
          purchase_units: [
            { payments: { captures: [{ id: "CAP-ROUTE-1", status: "COMPLETED", amount: { currency_code: "USD", value: "100.00" }, update_time: "2026-06-10T12:01:00Z" }] } },
          ],
        };
      }
      throw new Error(`unexpected ${url}`);
    });
    const response = await postWebhook(rawBody, signHeaders(rawBody, new Date().toISOString()));
    expect(response.status).toBe(200);
    const [stored] = await testDb.select().from(paymentEvents).where(eq(paymentEvents.providerEventId, "WH-APPR-1"));
    expect(stored?.status).toBe("processing");
    expect(inngest.send).toHaveBeenCalledOnce();

    const result = await processStoredPaymentEvent(stored!.id);
    expect(result.ok).toBe(true);
    const [invoice] = await testDb.select().from(invoices).where(eq(invoices.id, invoiceId));
    expect(invoice?.status).toBe("paid");
    const rows = await testDb.select().from(payments).where(eq(payments.invoiceId, invoiceId));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      providerCheckoutId: "ORDER-ROUTE-1",
      providerPaymentId: "CAP-ROUTE-1",
      status: "succeeded",
    });
  });

  it("never treats approval alone as paid when capture is unavailable", async () => {
    const event = approvedEvent();
    (event.resource.purchase_units[0] as Record<string, unknown>).custom_id = invoiceId;
    event.id = "WH-APPR-2";
    const rawBody = JSON.stringify(event);
    stubPaypalFetch((url) => {
      if (url.endsWith("/v1/oauth2/token")) return { access_token: "tok", expires_in: 3600 };
      throw Object.assign(new Error("order not approved"), { status: 422 });
    });
    expect((await postWebhook(rawBody, signHeaders(rawBody, new Date().toISOString()))).status).toBe(200);
    const [stored] = await testDb.select().from(paymentEvents).where(eq(paymentEvents.providerEventId, "WH-APPR-2"));
    await processStoredPaymentEvent(stored!.id);
    const rows = await testDb.select().from(payments).where(eq(payments.invoiceId, invoiceId));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("processing");
    expect(rows[0]?.providerPaymentId).toBeNull();
    const [invoice] = await testDb.select().from(invoices).where(eq(invoices.id, invoiceId));
    expect(invoice?.status).toBe("unpaid");
  });

  it("accumulates individual refunds idempotently", async () => {
    await testDb.insert(payments).values({
      id: `${prefix}_pay`,
      businessId: ids.businessId,
      invoiceId,
      amountInCents: 10000,
      paymentDate: "2026-06-10",
      method: "other",
      source: "provider",
      provider: "paypal",
      providerConnectionId: connectionId,
      providerCheckoutId: "ORDER-R",
      providerPaymentId: "CAP-R",
      status: "succeeded",
      refundedAmountInCents: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    stubPaypalFetch(() => {
      throw new Error("must not call");
    });

    const refund = (eventId: string, refundId: string, value: string) => ({
      id: eventId,
      event_type: "PAYMENT.CAPTURE.REFUNDED",
      resource_type: "refund",
      create_time: "2026-06-10T13:00:00Z",
      resource: {
        id: refundId,
        status: "COMPLETED",
        amount: { currency_code: "USD", value },
        links: [
          { rel: "self", href: "https://api-m.sandbox.paypal.com/v2/payments/refunds/x" },
          { rel: "up", href: "https://api-m.sandbox.paypal.com/v2/payments/captures/CAP-R" },
        ],
      },
    });

    for (const [eventId, refundId, value] of [["WH-R1", "REF-1", "20.00"], ["WH-R1", "REF-1", "20.00"], ["WH-R2", "REF-2", "30.00"]] as const) {
      const rawBody = JSON.stringify(refund(eventId, refundId, value));
      const response = await postWebhook(rawBody, signHeaders(rawBody, new Date().toISOString()));
      expect(response.status).toBe(200);
      const [stored] = await testDb.select().from(paymentEvents).where(eq(paymentEvents.providerEventId, eventId));
      if (stored && stored.status === "processing") await processStoredPaymentEvent(stored.id);
    }
    const [row] = await testDb.select().from(payments).where(eq(payments.id, `${prefix}_pay`));
    // 2000 once (duplicate ignored) + 3000 = 5000 cumulative.
    expect(row).toMatchObject({ status: "partially_refunded", refundedAmountInCents: 5000 });
    const [invoice] = await testDb.select().from(invoices).where(eq(invoices.id, invoiceId));
    expect(invoice?.status).toBe("partially_paid");
  });

  it("rejects forged signatures, foreign cert hosts, and replays", async () => {
    const rawBody = JSON.stringify(approvedEvent());
    stubPaypalFetch(() => {
      throw new Error("must not call");
    });
    const time = new Date().toISOString();
    const badSig = signHeaders(rawBody, time);
    badSig.set("paypal-transmission-sig", "bm90LWEtc2ln");
    expect((await postWebhook(rawBody, badSig)).status).toBe(400);

    const evil = signHeaders(rawBody, time);
    evil.set("paypal-cert-url", "https://evil.example.com/certs/x");
    const evilSig = (() => {
      const transmissionId = evil.get("paypal-transmission-id")!;
      const signer = createSign("SHA256");
      signer.update(`${transmissionId}|${time}|${WEBHOOK_ID}|${crc32UnsignedDecimal(rawBody)}`, "utf8");
      return signer.sign(privateKey, "base64");
    })();
    evil.set("paypal-transmission-sig", evilSig);
    expect((await postWebhook(rawBody, evil)).status).toBe(400);

    const staleTime = new Date(Date.now() - 3600_000).toISOString();
    expect((await postWebhook(rawBody, signHeaders(rawBody, staleTime))).status).toBe(400);
    expect(await testDb.select().from(paymentEvents).where(eq(paymentEvents.businessId, ids.businessId))).toHaveLength(0);
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("records unknown event types as ignored", async () => {
    const rawBody = JSON.stringify({ id: "WH-X", event_type: "BILLING.SUBSCRIPTION.CREATED", resource: {} });
    stubPaypalFetch(() => {
      throw new Error("must not call");
    });
    expect((await postWebhook(rawBody, signHeaders(rawBody, new Date().toISOString()))).status).toBe(200);
    const [event] = await testDb.select().from(paymentEvents).where(eq(paymentEvents.providerEventId, "WH-X"));
    expect(event?.status).toBe("ignored");
    expect(inngest.send).not.toHaveBeenCalled();
  });
});
