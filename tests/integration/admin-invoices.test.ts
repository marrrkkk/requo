import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");
  return { db: mockedDb };
});

const { requireAdminUserMock, revalidateTagMock, headersMock } = vi.hoisted(() => ({
  requireAdminUserMock: vi.fn(),
  revalidateTagMock: vi.fn(),
  headersMock: vi.fn(async () => new Headers()),
}));

vi.mock("@/features/admin/access", () => ({
  requireAdminUser: requireAdminUserMock,
}));

vi.mock("next/cache", () => ({
  revalidateTag: revalidateTagMock,
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

import {
  getAdminInvoiceDetailCore,
  getAdminInvoiceItems,
  getAdminInvoicePayments,
  listAdminInvoices,
} from "@/features/admin/queries";
import {
  businesses,
  invoiceLineItems,
  invoices,
  payments,
  quotes,
  user,
} from "@/lib/db/schema";

import { closeTestDb, testDb } from "@/tests/support/db";

const prefix = "test_admin_invoices";
const adminId = `${prefix}_admin`;
const ownerId = `${prefix}_owner`;
const businessId = `${prefix}_biz`;
const businessSlug = "test-admin-invoices";
const quoteId = `${prefix}_quote`;

const adminContext = {
  session: {
    session: { id: `${prefix}_session`, userId: adminId },
    user: { id: adminId },
  },
  user: {
    id: adminId,
    email: "admin@example.com",
    name: "Admin",
    role: "admin",
  },
};

async function cleanup() {
  await testDb.delete(payments).where(eq(payments.businessId, businessId));
  await testDb
    .delete(invoiceLineItems)
    .where(eq(invoiceLineItems.businessId, businessId));
  await testDb.delete(invoices).where(eq(invoices.businessId, businessId));
  await testDb.delete(quotes).where(eq(quotes.businessId, businessId));
  await testDb.delete(businesses).where(eq(businesses.id, businessId));
  await testDb.delete(user).where(eq(user.id, adminId));
  await testDb.delete(user).where(eq(user.id, ownerId));
}

describe("features/admin invoice queries", () => {
  beforeAll(async () => {
    await cleanup();
    const now = new Date();
    await testDb.insert(user).values([
      {
        id: adminId,
        name: "Admin User",
        email: `${prefix}.admin@example.com`,
        emailVerified: true,
        role: "admin",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: ownerId,
        name: "Owner User",
        email: `${prefix}.owner@example.com`,
        emailVerified: true,
        role: "user",
        createdAt: now,
        updatedAt: now,
      },
    ]);
    await testDb.insert(businesses).values({
      id: businessId,
      ownerUserId: ownerId,
      name: "Invoice Test Business",
      slug: businessSlug,
    });
    await testDb.insert(quotes).values({
      id: quoteId,
      businessId,
      quoteNumber: "Q-9001",
      title: "Faucet repair",
      customerName: "Jane Doe",
      status: "sent",
      validUntil: "2099-01-01",
    });
    await testDb.insert(invoices).values([
      {
        id: `${prefix}_paid`,
        businessId,
        invoiceNumber: "INV-PAID",
        title: "Paid work",
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        status: "sent",
        subtotalInCents: 5000,
        totalInCents: 5000,
        issueDate: "2026-09-01",
        dueDate: "2099-01-01",
      },
      {
        id: `${prefix}_overdue`,
        businessId,
        invoiceNumber: "INV-OD",
        title: "Overdue work",
        customerName: "John Smith",
        status: "sent",
        subtotalInCents: 8000,
        totalInCents: 8000,
        issueDate: "2020-01-01",
        dueDate: "2020-01-15",
      },
      {
        id: `${prefix}_open`,
        businessId,
        invoiceNumber: "INV-OPEN",
        title: "Open work",
        customerName: "Jane Doe",
        status: "sent",
        subtotalInCents: 3000,
        totalInCents: 3000,
        issueDate: "2026-09-01",
        dueDate: "2099-01-01",
      },
      {
        id: `${prefix}_quoted`,
        businessId,
        quoteId,
        invoiceNumber: "INV-Q",
        title: "Quoted work",
        customerName: "Jane Doe",
        status: "sent",
        subtotalInCents: 25000,
        totalInCents: 25000,
        issueDate: "2026-09-01",
        dueDate: "2099-01-01",
      },
      {
        id: `${prefix}_deleted`,
        businessId,
        invoiceNumber: "INV-DEL",
        title: "Deleted work",
        customerName: "Jane Doe",
        status: "sent",
        subtotalInCents: 1000,
        totalInCents: 1000,
        issueDate: "2026-09-01",
        dueDate: "2099-01-01",
        deletedAt: new Date(),
      },
    ]);
    await testDb.insert(payments).values({
      id: `${prefix}_pay`,
      businessId,
      invoiceId: `${prefix}_paid`,
      amountInCents: 5000,
      paymentDate: "2026-09-05",
      method: "cash",
    });
    await testDb.insert(invoiceLineItems).values({
      id: `${prefix}_item`,
      businessId,
      invoiceId: `${prefix}_quoted`,
      description: "Faucet cartridge replacement",
      quantity: 1,
      unitPriceInCents: 25000,
      lineTotalInCents: 25000,
      position: 0,
    });
  }, 30_000);

  afterAll(async () => {
    await cleanup();
    await closeTestDb();
  }, 30_000);

  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminUserMock.mockResolvedValue(adminContext);
  });

  it("lists invoices excluding soft-deleted rows", async () => {
    const result = await listAdminInvoices({ page: 1, pageSize: 25 });
    const numbers = result.items.map((item) => item.invoiceNumber);

    // The test database is shared, so scope to this fixture's rows.
    expect(numbers).toEqual(
      expect.arrayContaining(["INV-OD", "INV-OPEN", "INV-PAID", "INV-Q"]),
    );
    expect(numbers).not.toContain("INV-DEL");
  });

  it("searches by number, title, and customer", async () => {
    const byNumber = await listAdminInvoices({
      page: 1,
      pageSize: 25,
      search: "INV-OD",
    });
    expect(byNumber.items.map((item) => item.invoiceNumber)).toContain("INV-OD");

    const byCustomer = await listAdminInvoices({
      page: 1,
      pageSize: 25,
      search: "John Smith",
    });
    expect(byCustomer.items.map((item) => item.invoiceNumber)).toContain("INV-OD");
  });

  it("filters by effective status, not the stored row", async () => {
    const paid = await listAdminInvoices({
      page: 1,
      pageSize: 100,
      status: "paid",
    });
    const paidNumbers = paid.items.map((item) => item.invoiceNumber);
    expect(paidNumbers).toContain("INV-PAID");
    expect(paidNumbers).not.toContain("INV-OD");

    const overdue = await listAdminInvoices({
      page: 1,
      pageSize: 100,
      status: "overdue",
    });
    const overdueNumbers = overdue.items.map((item) => item.invoiceNumber);
    expect(overdueNumbers).toContain("INV-OD");
    expect(overdueNumbers).not.toContain("INV-PAID");

    const unpaid = await listAdminInvoices({
      page: 1,
      pageSize: 100,
      status: "unpaid",
    });
    const unpaidNumbers = unpaid.items.map((item) => item.invoiceNumber);
    expect(unpaidNumbers).toEqual(
      expect.arrayContaining(["INV-OPEN", "INV-Q"]),
    );
    expect(unpaidNumbers).not.toContain("INV-PAID");
    expect(unpaidNumbers).not.toContain("INV-OD");
  });

  it("returns the detail with items, payments, owner, and linked quote", async () => {
    const detail = await getAdminInvoiceDetailCore(`${prefix}_quoted`);
    const items = await getAdminInvoiceItems(`${prefix}_quoted`);

    expect(detail).toMatchObject({
      invoiceNumber: "INV-Q",
      title: "Quoted work",
      customerName: "Jane Doe",
      status: "unpaid",
      totalInCents: 25000,
      paidInCents: 0,
      balanceInCents: 25000,
    });
    expect(detail?.business).toMatchObject({
      id: businessId,
      name: "Invoice Test Business",
    });
    expect(detail?.owner).toMatchObject({
      userId: ownerId,
      email: `${prefix}.owner@example.com`,
    });
    expect(detail?.linkedQuote).toMatchObject({
      id: quoteId,
      quoteNumber: "Q-9001",
      status: "sent",
    });
    expect(items.map((item) => item.description)).toEqual([
      "Faucet cartridge replacement",
    ]);
  });

  it("resolves the effective paid status from payments", async () => {
    const detail = await getAdminInvoiceDetailCore(`${prefix}_paid`);
    const payments = await getAdminInvoicePayments(`${prefix}_paid`);

    expect(detail).toMatchObject({
      status: "paid",
      paidInCents: 5000,
      balanceInCents: 0,
    });
    expect(payments).toHaveLength(1);
  });

  it("returns null for a missing invoice", async () => {
    await expect(getAdminInvoiceDetailCore("missing-inv")).resolves.toBeNull();
  });
});
