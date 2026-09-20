import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { inArray } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}));

import {
  createInvoiceForBusiness,
  markInvoiceSentForBusiness,
  recordPaymentForBusiness,
  voidPaymentForBusiness,
} from "@/features/invoices/mutations";
import {
  getInvoiceExportRowsForBusiness,
  getInvoiceForBusiness,
  getInvoiceListForBusiness,
} from "@/features/invoices/queries";

import { closeTestDb, testDb } from "@/tests/support/db";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  type WorkflowFixtureIds,
} from "@/tests/support/fixtures/workflow";
import {
  activityLogs,
  businessNotifications,
  businessPaymentCounters,
  invoiceLineItems,
  invoices,
  payments,
} from "@/lib/db/schema";

const prefix = "test_invoice_pay_state";
let ids: WorkflowFixtureIds;

function invoiceInput(totalInCents: number, dueDate = "2099-01-01") {
  return {
    businessId: ids.businessId,
    actorUserId: ids.ownerUserId,
    title: "Service invoice",
    customerName: "John Doe",
    customerEmail: "john@example.com",
    customerContactMethod: "email",
    customerContactHandle: "john@example.com",
    currency: "USD",
    issueDate: "2026-06-01",
    dueDate,
    notes: null,
    paymentTerms: null,
    discountInCents: 0,
    taxInCents: 0,
    taxLabel: null,
    items: [{ description: "Work", quantity: 1, unitPriceInCents: totalInCents }],
  };
}

async function createSentInvoice(totalInCents = 10000, dueDate = "2099-01-01") {
  const created = (await createInvoiceForBusiness(invoiceInput(totalInCents, dueDate))) as { id: string };
  await markInvoiceSentForBusiness({ businessId: ids.businessId, invoiceId: created.id, actorUserId: ids.ownerUserId });
  return created.id;
}

async function cleanupFixture() {
  const businessIds = [ids.businessId, ids.otherBusinessId, ids.archivedBusinessId];
  await testDb.delete(businessNotifications).where(inArray(businessNotifications.businessId, businessIds));
  await testDb.delete(activityLogs).where(inArray(activityLogs.businessId, businessIds));
  await testDb.delete(payments).where(inArray(payments.businessId, businessIds));
  await testDb.delete(businessPaymentCounters).where(inArray(businessPaymentCounters.businessId, businessIds));
  await testDb.delete(invoiceLineItems).where(inArray(invoiceLineItems.businessId, businessIds));
  await testDb.delete(invoices).where(inArray(invoices.businessId, businessIds));
}

describe("invoice payment-derived state", () => {
  beforeEach(async () => {
    ids = await createWorkflowFixture(prefix);
    await cleanupFixture();
  }, 30_000);

  afterAll(async () => {
    await cleanupFixture();
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 30_000);

  it("list with no payments shows unpaid with full balance", async () => {
    const invoiceId = await createSentInvoice(10000);
    const rows = await getInvoiceListForBusiness({
      businessId: ids.businessId,
      filters: { status: "all", sort: "newest", page: 1 },
    });
    const row = rows.find((r) => r.id === invoiceId)!;
    expect(row).toMatchObject({ paidInCents: 0, balanceInCents: 10000, status: "unpaid" });
  }, 60_000);

  it("list/detail/export agree after partial, full, and voided payments", async () => {
    const invoiceId = await createSentInvoice(10000);
    const partial = await recordPaymentForBusiness({
      businessId: ids.businessId,
      invoiceId,
      actorUserId: ids.ownerUserId,
      amountInCents: 4000,
      paymentDate: "2026-06-02",
      method: "cash",
    });
    expect("error" in partial).toBe(false);

    const listPartial = (await getInvoiceListForBusiness({
      businessId: ids.businessId,
      filters: { status: "all", sort: "newest", page: 1 },
    })).find((r) => r.id === invoiceId)!;
    const detailPartial = await getInvoiceForBusiness({ businessId: ids.businessId, invoiceId });
    const exportPartial = (await getInvoiceExportRowsForBusiness({
      businessId: ids.businessId,
      filters: { status: "all", sort: "newest", page: 1 },
    })).find((r) => r.invoiceNumber === detailPartial!.invoiceNumber)!;
    expect(listPartial).toMatchObject({ paidInCents: 4000, balanceInCents: 6000, status: "partially_paid" });
    expect(detailPartial).toMatchObject({ paidInCents: 4000, balanceInCents: 6000, status: "partially_paid" });
    expect(exportPartial).toMatchObject({ paidInCents: 4000, balanceInCents: 6000, status: "partially_paid" });

    const full = await recordPaymentForBusiness({
      businessId: ids.businessId,
      invoiceId,
      actorUserId: ids.ownerUserId,
      amountInCents: 6000,
      paymentDate: "2026-06-03",
      method: "gcash",
    });
    const fullPaymentId = (full as { paymentId: string }).paymentId;
    const listFull = (await getInvoiceListForBusiness({
      businessId: ids.businessId,
      filters: { status: "all", sort: "newest", page: 1 },
    })).find((r) => r.id === invoiceId)!;
    expect(listFull).toMatchObject({ paidInCents: 10000, balanceInCents: 0, status: "paid" });

    await voidPaymentForBusiness({
      businessId: ids.businessId,
      paymentId: fullPaymentId,
      actorUserId: ids.ownerUserId,
      reason: "duplicate_entry",
    });
    const listVoid = (await getInvoiceListForBusiness({
      businessId: ids.businessId,
      filters: { status: "all", sort: "newest", page: 1 },
    })).find((r) => r.id === invoiceId)!;
    const detailVoid = await getInvoiceForBusiness({ businessId: ids.businessId, invoiceId });
    expect(listVoid).toMatchObject({ paidInCents: 4000, balanceInCents: 6000, status: "partially_paid" });
    expect(detailVoid).toMatchObject({ paidInCents: 4000, balanceInCents: 6000, status: "partially_paid" });
  }, 60_000);

  it("status filtering uses effective status", async () => {
    const invoiceId = await createSentInvoice(10000);
    await recordPaymentForBusiness({
      businessId: ids.businessId,
      invoiceId,
      actorUserId: ids.ownerUserId,
      amountInCents: 4000,
      paymentDate: "2026-06-02",
      method: "cash",
    });
    const partial = await getInvoiceListForBusiness({
      businessId: ids.businessId,
      filters: { status: "partially_paid", sort: "newest", page: 1 },
    });
    expect(partial.some((r) => r.id === invoiceId)).toBe(true);
    const paid = await getInvoiceListForBusiness({
      businessId: ids.businessId,
      filters: { status: "paid", sort: "newest", page: 1 },
    });
    expect(paid.some((r) => r.id === invoiceId)).toBe(false);
  }, 60_000);

  it("payments from another business never affect the invoice", async () => {
    const invoiceId = await createSentInvoice(10000);
    const [other] = await testDb
      .select({ id: invoices.id })
      .from(invoices)
      .where(inArray(invoices.businessId, [ids.businessId]));
    expect(other.id).toBeDefined();
    const rows = await getInvoiceListForBusiness({
      businessId: ids.otherBusinessId,
      filters: { status: "all", sort: "newest", page: 1 },
    });
    expect(rows.some((r) => r.id === invoiceId)).toBe(false);
  }, 60_000);
});
