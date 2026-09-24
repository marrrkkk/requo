import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

import { createInquiryFormConfigDefaults } from "@/features/inquiries/form-config";
import {
  completeFollowUpForBusiness,
  createFollowUpForBusiness,
  FollowUpCreateValidationError,
  rescheduleFollowUpForBusiness,
  skipFollowUpForBusiness,
} from "@/features/follow-ups/mutations";
import {
  activityLogs,
  businessInquiryForms,
  businessMembers,
  businesses,
  followUps,
  inquiries,
  quotes,
  user,
} from "@/lib/db/schema";

import { closeTestDb, testDb } from "@/tests/support/db";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

const ownerUserId = "test_follow_up_owner";
const businessId = "test_follow_up_business";
const formId = "test_follow_up_form";
const inquiryId = "test_follow_up_inquiry";
const quoteId = "test_follow_up_quote";

async function cleanFixtures() {
  await testDb.delete(followUps).where(eq(followUps.businessId, businessId));
  await testDb.delete(activityLogs).where(eq(activityLogs.businessId, businessId));
  await testDb.delete(quotes).where(eq(quotes.businessId, businessId));
  await testDb.delete(inquiries).where(eq(inquiries.businessId, businessId));
  await testDb.delete(businessInquiryForms).where(eq(businessInquiryForms.id, formId));
  await testDb.delete(businessMembers).where(eq(businessMembers.businessId, businessId));
  await testDb.delete(businesses).where(eq(businesses.id, businessId));
  await testDb.delete(businessMembers).where(eq(businessMembers.businessId, businessId));
  await testDb.delete(businesses).where(eq(businesses.id, businessId));
  await testDb.delete(user).where(eq(user.id, ownerUserId));
}

describe("features/follow-ups/mutations", () => {
  beforeAll(async () => {
    const now = new Date("2026-04-20T00:00:00.000Z");

    await cleanFixtures();

    await testDb.insert(user).values({
      id: ownerUserId,
      name: "Follow Up Owner",
      email: "follow-up-owner@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    await testDb.insert(businesses).values({
      id: businessId,
      ownerUserId,
      name: "Follow Up Business",
      slug: "follow-up-business",
      businessType: "general_project_services",
      defaultCurrency: "USD",
      createdAt: now,
      updatedAt: now,
    });

    await testDb.insert(businessMembers).values({
      id: "test_follow_up_business_member",
      businessId,
      userId: ownerUserId,
      role: "owner",
      createdAt: now,
      updatedAt: now,
    });

    const formPayload: typeof businessInquiryForms.$inferInsert = {
      id: formId,
      businessId,
      name: "Follow Up Form",
      slug: "follow-up-form",
      businessType: "general_project_services",
      isDefault: true,
      publicInquiryEnabled: true,
      inquiryFormConfig: createInquiryFormConfigDefaults({
        businessType: "general_project_services",
      }),
      inquiryPageConfig: {},
      createdAt: now,
      updatedAt: now,
    } as typeof businessInquiryForms.$inferInsert;

    await testDb.insert(businessInquiryForms).values(formPayload);

    await testDb.insert(inquiries).values({
      id: inquiryId,
      businessId,
      businessInquiryFormId: formId,
      status: "new",
      subject: "Website redesign",
      customerName: "Taylor Nguyen",
      customerEmail: "taylor@example.com",
      customerContactMethod: "email",
      customerContactHandle: "taylor@example.com",
      serviceCategory: null,
      details: "Customer needs a redesigned marketing website.",
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await testDb.insert(quotes).values({
      id: quoteId,
      businessId,
      inquiryId,
      status: "sent",
      quoteNumber: "Q-FUP-1",
      publicToken: "followuptoken123",
      title: "Website redesign quote",
      customerName: "Taylor Nguyen",
      customerEmail: "taylor@example.com",
      customerContactMethod: "email",
      customerContactHandle: "taylor@example.com",
      currency: "USD",
      subtotalInCents: 100000,
      discountInCents: 0,
      totalInCents: 100000,
      validUntil: "2026-05-20",
      sentAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }, 30_000);

  afterAll(async () => {
    await cleanFixtures();
    await closeTestDb();
  }, 30_000);

  it("creates an inquiry follow-up without changing the inquiry", async () => {
    const result = await createFollowUpForBusiness({
      businessId,
      inquiryId,
      actorUserId: ownerUserId,
      assignedToUserId: ownerUserId,
      followUp: {
        title: "Ask for missing details",
        reason: "Customer did not provide launch timing.",
        channel: "email",
        dueDate: "2026-04-23",
      },
    });

    expect(result?.followUpId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );

    const [followUp] = await testDb
      .select()
      .from(followUps)
      .where(eq(followUps.id, result!.followUpId));

    expect(followUp).toEqual(
      expect.objectContaining({
        businessId,
        inquiryId,
        quoteId: null,
        status: "pending",
        assignedToUserId: ownerUserId,
      }),
    );

    const [inquiry] = await testDb
      .select({ status: inquiries.status })
      .from(inquiries)
      .where(eq(inquiries.id, inquiryId));

    expect(inquiry.status).toBe("new");
  });

  it("creates a quote follow-up and links the quote's inquiry for history", async () => {
    const result = await createFollowUpForBusiness({
      businessId,
      quoteId,
      actorUserId: ownerUserId,
      assignedToUserId: ownerUserId,
      followUp: {
        title: "Check quote response",
        reason: "Follow up after sharing the quote.",
        channel: "email",
        dueDate: "2026-04-24",
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        inquiryId,
        quoteId,
        status: "pending",
      }),
    );
  });

  it("completes, reschedules, and skips only pending follow-ups", async () => {
    const created = await createFollowUpForBusiness({
      businessId,
      inquiryId,
      actorUserId: ownerUserId,
      assignedToUserId: ownerUserId,
      followUp: {
        title: "Follow up lifecycle",
        reason: "Exercise follow-up state transitions.",
        channel: "email",
        dueDate: "2026-04-25",
      },
    });

    const rescheduled = await rescheduleFollowUpForBusiness({
      businessId,
      followUpId: created!.followUpId,
      actorUserId: ownerUserId,
      followUp: {
        dueDate: "2026-04-26",
      },
    });

    expect(rescheduled).toEqual(
      expect.objectContaining({
        changed: true,
        locked: false,
        status: "pending",
      }),
    );

    const completed = await completeFollowUpForBusiness({
      businessId,
      followUpId: created!.followUpId,
      actorUserId: ownerUserId,
    });

    expect(completed).toEqual(
      expect.objectContaining({
        changed: true,
        locked: false,
        status: "completed",
      }),
    );

    const skippedAfterComplete = await skipFollowUpForBusiness({
      businessId,
      followUpId: created!.followUpId,
      actorUserId: ownerUserId,
    });

    expect(skippedAfterComplete).toEqual(
      expect.objectContaining({
        changed: false,
        locked: true,
        status: "completed",
      }),
    );

    const createdForSkip = await createFollowUpForBusiness({
      businessId,
      inquiryId,
      actorUserId: ownerUserId,
      assignedToUserId: ownerUserId,
      followUp: {
        title: "Skip this follow-up",
        reason: "Customer already called.",
        channel: "phone",
        dueDate: "2026-04-27",
      },
    });

    const skipped = await skipFollowUpForBusiness({
      businessId,
      followUpId: createdForSkip!.followUpId,
      actorUserId: ownerUserId,
    });

    expect(skipped).toEqual(
      expect.objectContaining({
        changed: true,
        locked: false,
        status: "skipped",
      }),
    );
  }, 15_000);

  it("does not create follow-ups for records outside the scoped business", async () => {    const result = await createFollowUpForBusiness({
      businessId,
      inquiryId: "missing_inquiry",
      actorUserId: ownerUserId,
      assignedToUserId: ownerUserId,
      followUp: {
        title: "Invalid follow-up",
        reason: "This should not be created.",
        channel: "email",
        dueDate: "2026-04-23",
      },
    });

    expect(result).toBeNull();
  });

  it("defaults send mode to manual and persists automatic", async () => {
    const manual = await createFollowUpForBusiness({
      businessId,
      inquiryId,
      actorUserId: ownerUserId,
      assignedToUserId: ownerUserId,
      followUp: {
        title: "Manual send mode default",
        reason: "Defaults should keep existing behavior.",
        channel: "email",
        dueDate: "2026-04-28",
      },
    });

    const [manualRow] = await testDb
      .select({ sendMode: followUps.sendMode })
      .from(followUps)
      .where(eq(followUps.id, manual!.followUpId));

    expect(manualRow.sendMode).toBe("manual");

    const automatic = await createFollowUpForBusiness({
      businessId,
      quoteId,
      actorUserId: ownerUserId,
      assignedToUserId: ownerUserId,
      followUp: {
        title: "Automatic send mode",
        reason: "Customer should receive this by email.",
        channel: "email",
        sendMode: "automatic",
        dueDate: "2026-04-29",
      },
    });

    const [automaticRow] = await testDb
      .select({ sendMode: followUps.sendMode })
      .from(followUps)
      .where(eq(followUps.id, automatic!.followUpId));

    expect(automaticRow.sendMode).toBe("automatic");
  });

  it("rejects automatic follow-ups without a customer email", async () => {
    const noEmailInquiryId = "test_follow_up_inquiry_no_email";
    const now = new Date("2026-04-20T00:00:00.000Z");

    await testDb
      .insert(inquiries)
      .values({
        id: noEmailInquiryId,
        businessId,
        businessInquiryFormId: formId,
        status: "new",
        subject: "No email inquiry",
        customerName: "No Email",
        customerEmail: null,
        details: "Customer left no email address.",
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    await expect(
      createFollowUpForBusiness({
        businessId,
        inquiryId: noEmailInquiryId,
        actorUserId: ownerUserId,
        assignedToUserId: ownerUserId,
        followUp: {
          title: "Automatic without email",
          reason: "This should be rejected.",
          channel: "email",
          sendMode: "automatic",
          dueDate: "2026-04-30",
        },
      }),
    ).rejects.toBeInstanceOf(FollowUpCreateValidationError);
  });

  it("inherits send mode on recurring follow-ups", async () => {
    const created = await createFollowUpForBusiness({
      businessId,
      quoteId,
      actorUserId: ownerUserId,
      assignedToUserId: ownerUserId,
      followUp: {
        title: "Recurring automatic",
        reason: "Each occurrence should stay automatic.",
        channel: "email",
        sendMode: "automatic",
        dueDate: "2026-05-01",
        recurrence: "daily",
      },
    });

    await completeFollowUpForBusiness({
      businessId,
      followUpId: created!.followUpId,
      actorUserId: ownerUserId,
    });

    const spawned = await testDb
      .select({ sendMode: followUps.sendMode })
      .from(followUps)
      .where(eq(followUps.parentFollowUpId, created!.followUpId));

    expect(spawned).toHaveLength(1);
    expect(spawned[0].sendMode).toBe("automatic");
  });
});
