import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("./db");

  return { db: mockedDb };
});

import { POST } from "@/app/api/public/analytics/route";
import { analyticsEvents, quotes } from "@/lib/db/schema";

import { closeTestDb, testDb } from "./db";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  type WorkflowFixtureIds,
} from "./workflow-fixtures";

const prefix = "test_public_analytics";
let ids: WorkflowFixtureIds;

async function insertQuote({
  id,
  status,
}: {
  id: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired" | "voided";
}) {
  const now = new Date("2026-04-20T00:00:00.000Z");

  await testDb.insert(quotes).values({
    id,
    businessId: ids.businessId,
    inquiryId: ids.inquiryId,
    status,
    quoteNumber: `Q-${id.toUpperCase().slice(-8)}`,
    publicToken: `${id}-public-token`,
    title: "Analytics quote",
    customerName: "Taylor Nguyen",
    customerEmail: "taylor@example.com",
    customerContactMethod: "email",
    customerContactHandle: "taylor@example.com",
    currency: "USD",
    subtotalInCents: 10000,
    discountInCents: 0,
    totalInCents: 10000,
    validUntil: "2026-05-31",
    sentAt: status === "draft" ? null : now,
    createdAt: now,
    updatedAt: now,
  });
}

function analyticsRequest(body: unknown) {
  return new Request("http://localhost/api/public/analytics", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "user-agent": "workflow-test-browser",
      "x-forwarded-for": "203.0.113.10",
    },
  });
}

describe("public analytics route", () => {
  beforeEach(async () => {
    ids = await createWorkflowFixture(prefix);
  }, 30_000);

  afterAll(async () => {
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 30_000);

  it("rejects malformed events before touching analytics storage", async () => {
    const response = await POST(
      analyticsRequest({
        eventType: "quote_public_viewed",
        businessId: ids.businessId,
      }),
    );

    expect(response.status).toBe(400);

    const events = await testDb
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.businessId, ids.businessId));

    expect(events).toHaveLength(0);
  });

  it("records public quote views once per visitor window and marks the quote viewed", async () => {
    const quoteId = `${prefix}_quote_sent`;

    await insertQuote({ id: quoteId, status: "sent" });

    const body = {
      eventType: "quote_public_viewed",
      businessId: ids.businessId,
      quoteId,
    };

    const firstResponse = await POST(analyticsRequest(body));
    const firstBody = await firstResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(firstBody).toEqual({ ok: true, tracked: true });

    const secondResponse = await POST(analyticsRequest(body));
    const secondBody = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(secondBody).toEqual({ ok: true, tracked: false });

    const events = await testDb
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.businessId, ids.businessId),
          eq(analyticsEvents.quoteId, quoteId),
          eq(analyticsEvents.eventType, "quote_public_viewed"),
        ),
      );
    const [storedQuote] = await testDb
      .select()
      .from(quotes)
      .where(eq(quotes.id, quoteId));

    expect(events).toHaveLength(1);
    expect(storedQuote.publicViewedAt).toBeInstanceOf(Date);
  });

  it("does not track draft quotes or mark them as publicly viewed", async () => {
    const quoteId = `${prefix}_quote_draft`;

    await insertQuote({ id: quoteId, status: "draft" });

    const response = await POST(
      analyticsRequest({
        eventType: "quote_public_viewed",
        businessId: ids.businessId,
        quoteId,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, tracked: false });

    const events = await testDb
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.quoteId, quoteId));
    const [storedQuote] = await testDb
      .select()
      .from(quotes)
      .where(eq(quotes.id, quoteId));

    expect(events).toHaveLength(0);
    expect(storedQuote.publicViewedAt).toBeNull();
  });
});
