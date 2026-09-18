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

import { createFakeAdapter } from "@/lib/payments/fake-adapter";
import { reconcileNormalizedEvent } from "@/lib/payments/reconciliation";
import type { ProviderPaymentSnapshot } from "@/lib/payments/types";
import { createInvoiceForBusiness, markInvoiceSentForBusiness } from "@/features/invoices/mutations";
import {
  createProviderCheckoutForBusiness,
  initiateProviderRefundForBusiness,
} from "@/features/payment-providers/mutations";
import { refreshProviderPayment } from "@/lib/payments/reconciliation";
import {
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

const prefix = "test_conn_status";
let ids: WorkflowFixtureIds;
let connectionId: string;
let invoiceId: string;

async function setStatus(status: "onboarding" | "action_required" | "ready" | "revoked") {
  await testDb
    .update(paymentProviderConnections)
    .set({ status, updatedAt: new Date() })
    .where(eq(paymentProviderConnections.id, connectionId));
}

async function cleanup() {
  const businessIds = [ids.businessId, ids.otherBusinessId, ids.archivedBusinessId];
  await testDb.delete(paymentEvents).where(inArray(paymentEvents.businessId, businessIds));
  await testDb.delete(payments).where(inArray(payments.businessId, businessIds));
  await testDb.delete(invoiceLineItems).where(inArray(invoiceLineItems.businessId, businessIds));
  await testDb.delete(invoices).where(inArray(invoices.businessId, businessIds));
}

describe("provider connection status gating", () => {
  vi.setConfig({ testTimeout: 120_000 });

  beforeAll(async () => {
    ids = await createWorkflowFixture(prefix);
    connectionId = `${prefix}_conn`;
    await testDb
      .insert(paymentProviderConnections)
      .values({
        id: connectionId,
        businessId: ids.businessId,
        provider: "paymongo",
        environment: "test",
        credentialsCiphertext: "test-ciphertext",
        publicHint: "••••1234",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
  }, 60_000);

  beforeEach(async () => {
    vi.clearAllMocks();
    await cleanup();
    await setStatus("ready");
    const created = await createInvoiceForBusiness({
      businessId: ids.businessId,
      actorUserId: ids.ownerUserId,
      title: "Status gate invoice",
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
    await cleanup();
    await testDb.delete(paymentProviderConnections).where(eq(paymentProviderConnections.id, connectionId));
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 60_000);

  it("backfills existing-style rows as working BYO connections", async () => {
    const [row] = await testDb
      .select()
      .from(paymentProviderConnections)
      .where(eq(paymentProviderConnections.id, connectionId))
      .limit(1);
    expect(row).toMatchObject({ status: "ready", authMode: "byo", providerAccountId: null });
  });

  it("rejects linking one provider account to two businesses", async () => {
    const secondId = `${prefix}_conn2`;
    await testDb.insert(paymentProviderConnections).values({
      id: secondId,
      businessId: ids.otherBusinessId,
      provider: "paymongo",
      environment: "test",
      credentialsCiphertext: "x",
      providerAccountId: "acct_shared",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await expect(
      testDb.insert(paymentProviderConnections).values({
        id: `${prefix}_conn3`,
        businessId: ids.businessId,
        provider: "paymongo",
        environment: "test",
        credentialsCiphertext: "x",
        providerAccountId: "acct_shared",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).rejects.toThrow();
    // Same account in the other environment is fine.
    await testDb.insert(paymentProviderConnections).values({
      id: `${prefix}_conn4`,
      businessId: ids.businessId,
      provider: "paymongo",
      environment: "live",
      credentialsCiphertext: "x",
      providerAccountId: "acct_shared",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await testDb.delete(paymentProviderConnections).where(
      inArray(paymentProviderConnections.id, [secondId, `${prefix}_conn4`]),
    );
  });

  it("blocks checkout on revoked and incomplete connections without writing rows", async () => {
    const fake = createFakeAdapter("paymongo");
    for (const status of ["revoked", "onboarding", "action_required"] as const) {
      await setStatus(status);
      const result = await createProviderCheckoutForBusiness({
        businessId: ids.businessId,
        actorUserId: ids.ownerUserId,
        invoiceId,
        connectionId,
        amountInCents: 1000,
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        adapter: fake,
        credentials: {},
      });
      expect("error" in result && result.error).toBeTruthy();
    }
    expect(await testDb.select().from(payments).where(eq(payments.invoiceId, invoiceId))).toHaveLength(0);
  });

  it("blocks refund and refresh on revoked connections", async () => {
    const [paymentId] = await testDb
      .insert(payments)
      .values({
        id: `${prefix}_pay`,
        businessId: ids.businessId,
        invoiceId,
        amountInCents: 10000,
        paymentDate: "2026-06-10",
        method: "other",
        createdBy: ids.ownerUserId,
        source: "provider",
        provider: "paymongo",
        providerConnectionId: connectionId,
        providerPaymentId: `${prefix}_pmt`,
        status: "succeeded",
        refundedAmountInCents: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: payments.id });
    void paymentId;
    await setStatus("revoked");

    const refund = await initiateProviderRefundForBusiness({
      businessId: ids.businessId,
      actorUserId: ids.ownerUserId,
      paymentId: `${prefix}_pay`,
      amountInCents: 1000,
      adapter: createFakeAdapter("paymongo"),
      credentials: {},
    });
    expect("error" in refund && refund.error).toMatch(/revoked/i);

    const refreshed = await refreshProviderPayment({
      businessId: ids.businessId,
      actorUserId: ids.ownerUserId,
      connectionId,
      providerPaymentId: `${prefix}_pmt`,
      credentials: {},
      adapter: createFakeAdapter("paymongo"),
    });
    expect(refreshed).toEqual({ ok: false, reason: "connection_not_ready" });

    const [row] = await testDb.select().from(payments).where(eq(payments.id, `${prefix}_pay`));
    expect(row?.refundedAmountInCents).toBe(0);
  });

  it("still reconciles in-flight webhooks on revoked connections", async () => {
    await setStatus("revoked");
    const snapshot: ProviderPaymentSnapshot = {
      provider: "paymongo",
      environment: "test",
      providerCheckoutId: `${prefix}_chk`,
      providerPaymentId: `${prefix}_pmt2`,
      status: "succeeded",
      amountInCents: 10000,
      refundedAmountInCents: 0,
      currency: "USD",
      invoiceId,
      businessId: ids.businessId,
      connectionId,
      occurredAt: new Date("2026-06-10T00:00:00.000Z"),
    };
    const result = await reconcileNormalizedEvent({
      eventId: null,
      normalized: { providerEventId: `${prefix}_evt`, rawType: "payment.paid", snapshot, rawPayload: {} },
      connectionId,
      actorUserId: null,
    });
    expect(result.ok && "paidTransition" in result && result.paidTransition).toBe(true);
    const [invoice] = await testDb.select().from(invoices).where(eq(invoices.id, invoiceId));
    expect(invoice?.status).toBe("paid");
  });

  it("allows checkout again once the connection is ready", async () => {
    await setStatus("revoked");
    await setStatus("ready");
    const result = await createProviderCheckoutForBusiness({
      businessId: ids.businessId,
      actorUserId: ids.ownerUserId,
      invoiceId,
      connectionId,
      amountInCents: 1000,
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
      adapter: createFakeAdapter("paymongo"),
      credentials: {},
    });
    expect("checkoutUrl" in result).toBe(true);
  });
});
