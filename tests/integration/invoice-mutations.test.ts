import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq, inArray } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
}));

import {
  createInvoiceForBusiness,
  markInvoiceSentForBusiness,
  recordPaymentForBusiness,
  updateInvoiceDraftForBusiness,
  voidInvoiceForBusiness,
} from "@/features/invoices/mutations";
import { getInvoiceIdByQuoteId } from "@/features/invoices/queries";
import { createQuoteForBusiness } from "@/features/quotes/mutations";
import {
  businessNotifications,
  invoiceLineItems,
  invoices,
  payments,
  quotes,
} from "@/lib/db/schema";

import { closeTestDb, testDb } from "@/tests/support/db";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  type WorkflowFixtureIds,
} from "@/tests/support/fixtures/workflow";

const prefix = "test_invoice_flow";
let ids: WorkflowFixtureIds;

function manualInvoiceInput(overrides: Record<string, unknown> = {}) {
  return {
    businessId: ids.businessId,
    actorUserId: ids.ownerUserId,
    title: "Deep clean invoice",
    customerName: "Jane Doe",
    customerEmail: "jane@example.com",
    customerContactMethod: "email",
    customerContactHandle: "jane@example.com",
    currency: "USD",
    issueDate: "2026-06-01",
    dueDate: "2026-06-15",
    notes: null,
    paymentTerms: "Due within 14 days.",
    discountInCents: 0,
    taxInCents: 0,
    taxLabel: null,
    items: [{ description: "Deep clean", quantity: 2, unitPriceInCents: 5000 }],
    ...overrides,
  };
}

async function createAcceptedQuote() {
  const created = await createQuoteForBusiness({
    businessId: ids.businessId,
    actorUserId: ids.ownerUserId,
    currency: "USD",
    inquiryId: ids.inquiryId,
    quote: {
      title: "Accepted work",
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      customerContactMethod: "email",
      customerContactHandle: "jane@example.com",
      notes: "",
      validUntil: "2099-12-31",
      discountInCents: 0,
      taxInCents: 0,
      items: [{ id: "line-1", description: "Work", quantity: 1, unitPriceInCents: 10000 }],
    },
  });
  const quoteId = created!.id;
  await testDb.update(quotes).set({ status: "accepted", acceptedAt: new Date() }).where(eq(quotes.id, quoteId));
  return quoteId;
}

async function cleanupInvoiceFixture() {
  const businessIds = [ids.businessId, ids.otherBusinessId, ids.archivedBusinessId];
  await testDb.delete(businessNotifications).where(inArray(businessNotifications.businessId, businessIds));
  await testDb.delete(payments).where(inArray(payments.businessId, businessIds));
  await testDb.delete(invoiceLineItems).where(inArray(invoiceLineItems.businessId, businessIds));
  await testDb.delete(invoices).where(inArray(invoices.businessId, businessIds));
}

describe("features/invoices/mutations", () => {
  beforeEach(async () => {
    ids = await createWorkflowFixture(prefix);
    await cleanupInvoiceFixture();
  }, 30_000);

  afterAll(async () => {
    await cleanupInvoiceFixture();
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 30_000);

  it("creates manual invoices with calculated totals", async () => {
    const created = await createInvoiceForBusiness(manualInvoiceInput());

    expect(created && "id" in created && created.id).toMatch(/^inv_/);

    const [stored] = await testDb.select().from(invoices).where(eq(invoices.id, (created as { id: string }).id));
    expect(stored).toEqual(
      expect.objectContaining({ status: "draft", subtotalInCents: 10000, totalInCents: 10000 }),
    );
  });

  it("converts an accepted quote once and links both directions", async () => {
    const quoteId = await createAcceptedQuote();
    const first = await createInvoiceForBusiness({ ...manualInvoiceInput(), quoteId });
    const second = await createInvoiceForBusiness({ ...manualInvoiceInput(), quoteId });

    expect(first && "existing" in first && first.existing).toBe(false);
    expect(second && "existing" in second && second.existing).toBe(true);
    expect((first as { id: string }).id).toBe((second as { id: string }).id);

    const linked = await getInvoiceIdByQuoteId({ businessId: ids.businessId, quoteId });
    expect(linked?.id).toBe((first as { id: string }).id);

    const outsider = await getInvoiceIdByQuoteId({ businessId: ids.otherBusinessId, quoteId });
    expect(outsider).toBeNull();
  });

  it("rejects conversion of non-accepted quotes", async () => {
    const created = await createQuoteForBusiness({
      businessId: ids.businessId,
      actorUserId: ids.ownerUserId,
      currency: "USD",
      inquiryId: ids.inquiryId,
      quote: {
        title: "Draft work",
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        customerContactMethod: "email",
        customerContactHandle: "jane@example.com",
        notes: "",
        validUntil: "2099-12-31",
        discountInCents: 0,
        taxInCents: 0,
        items: [{ id: "line-1", description: "Work", quantity: 1, unitPriceInCents: 10000 }],
      },
    });
    const result = await createInvoiceForBusiness({ ...manualInvoiceInput(), quoteId: created!.id });
    expect(result).toEqual({ error: "Only accepted quotes can be converted into invoices." });
  });

  it("edits manual drafts but locks sent invoices", async () => {
    const created = (await createInvoiceForBusiness(manualInvoiceInput())) as { id: string };
    const updated = await updateInvoiceDraftForBusiness({
      businessId: ids.businessId,
      invoiceId: created.id,
      actorUserId: ids.ownerUserId,
      title: "Updated title",
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      issueDate: "2026-06-01",
      dueDate: "2026-06-20",
      notes: null,
      paymentTerms: null,
      discountInCents: 0,
      taxInCents: 0,
      taxLabel: null,
      items: [{ description: "Deep clean", quantity: 1, unitPriceInCents: 7000 }],
    });
    expect(updated).toEqual(expect.objectContaining({ changed: true }));

    const [stored] = await testDb.select().from(invoices).where(eq(invoices.id, created.id));
    expect(stored.totalInCents).toBe(7000);

    await markInvoiceSentForBusiness({ businessId: ids.businessId, invoiceId: created.id, actorUserId: ids.ownerUserId });
    const locked = await updateInvoiceDraftForBusiness({
      businessId: ids.businessId,
      invoiceId: created.id,
      actorUserId: ids.ownerUserId,
      title: "Too late",
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      issueDate: "2026-06-01",
      dueDate: "2026-06-20",
      notes: null,
      paymentTerms: null,
      discountInCents: 0,
      taxInCents: 0,
      taxLabel: null,
      items: [{ description: "Deep clean", quantity: 1, unitPriceInCents: 7000 }],
    });
    expect(locked).toEqual({ error: "Only draft invoices can be edited." });
  });

  it("records payments to paid and writes an invoice_paid notification", async () => {
    const created = (await createInvoiceForBusiness(manualInvoiceInput())) as { id: string };
    await markInvoiceSentForBusiness({ businessId: ids.businessId, invoiceId: created.id, actorUserId: ids.ownerUserId });
    const result = await recordPaymentForBusiness({
      businessId: ids.businessId,
      invoiceId: created.id,
      actorUserId: ids.ownerUserId,
      amountInCents: 10000,
      paymentDate: "2026-06-02",
      method: "cash",
    });

    expect(result).toEqual(expect.objectContaining({ status: "paid" }));

    const notes = await testDb
      .select()
      .from(businessNotifications)
      .where(and(eq(businessNotifications.businessId, ids.businessId), eq(businessNotifications.type, "invoice_paid")));
    expect(notes).toHaveLength(1);
    expect(notes[0].invoiceId).toBe(created.id);
  });

  it("blocks voiding invoices with recorded payments", async () => {
    const created = (await createInvoiceForBusiness(manualInvoiceInput())) as { id: string };
    await markInvoiceSentForBusiness({ businessId: ids.businessId, invoiceId: created.id, actorUserId: ids.ownerUserId });
    await recordPaymentForBusiness({
      businessId: ids.businessId,
      invoiceId: created.id,
      actorUserId: ids.ownerUserId,
      amountInCents: 1000,
      paymentDate: "2026-06-02",
      method: "cash",
    });
    const result = await voidInvoiceForBusiness({
      businessId: ids.businessId,
      invoiceId: created.id,
      actorUserId: ids.ownerUserId,
    });
    expect(result).toEqual({ error: "Void all recorded payments before voiding this invoice." });
  });
});
