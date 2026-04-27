import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("./db");

  return { db: mockedDb };
});

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

import {
  addInquiryNoteForBusiness,
  createManualInquirySubmission,
  createPublicInquirySubmission,
} from "@/features/inquiries/mutations";
import { getPublicInquiryBusinessBySlug } from "@/features/inquiries/queries";
import { validatePublicInquirySubmission } from "@/features/inquiries/schemas";
import {
  activityLogs,
  businessNotifications,
  inquiries,
  inquiryNotes,
} from "@/lib/db/schema";

import { closeTestDb, testDb } from "./db";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  type WorkflowFixtureIds,
} from "./workflow-fixtures";

const prefix = "test_inquiry_workflow";
let ids: WorkflowFixtureIds;

type InquiryValidationResult = ReturnType<typeof validatePublicInquirySubmission>;

function expectValidSubmission(result: InquiryValidationResult) {
  if (!result.success) {
    throw new Error("Expected inquiry submission validation to pass.");
  }

  return result.data;
}

function inquiryFormData(email = "new-customer@example.com") {
  const formData = new FormData();
  formData.set("customerName", "New Customer");
  formData.set("customerContactMethod", "email");
  formData.set("customerContactHandle", email);
  formData.set("serviceCategory", "Storefront refresh");
  formData.set("budgetText", "Around $2,000");
  formData.set(
    "details",
    "Need new storefront graphics, window vinyl, and a small door decal.",
  );

  return formData;
}

describe("features/inquiries public and manual submissions", () => {
  beforeEach(async () => {
    ids = await createWorkflowFixture(prefix);
  }, 30_000);

  afterAll(async () => {
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 30_000);

  it("creates public inquiries with field snapshots, activity, and owner notification", async () => {
    const business = await getPublicInquiryBusinessBySlug(ids.businessSlug);

    if (!business) {
      throw new Error("Expected seeded business to be public.");
    }

    const validation = validatePublicInquirySubmission(
      business.inquiryFormConfig,
      inquiryFormData(),
    );
    const submission = expectValidSubmission(validation);

    const created = await createPublicInquirySubmission({
      business,
      submission,
    });

    expect(created.inquiryId).toMatch(/^inq_/);
    expect(created.attachmentName).toBeNull();

    const [storedInquiry] = await testDb
      .select()
      .from(inquiries)
      .where(eq(inquiries.id, created.inquiryId));

    expect(storedInquiry).toEqual(
      expect.objectContaining({
        businessId: ids.businessId,
        businessInquiryFormId: ids.formId,
        status: "new",
        source: "public-inquiry-page",
        customerEmail: "new-customer@example.com",
        serviceCategory: "Storefront refresh",
      }),
    );
    expect(storedInquiry.submittedFieldSnapshot?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "serviceCategory",
          displayValue: "Storefront refresh",
        }),
        expect.objectContaining({
          id: "details",
          displayValue:
            "Need new storefront graphics, window vinyl, and a small door decal.",
        }),
      ]),
    );

    const [activity] = await testDb
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.inquiryId, created.inquiryId));

    expect(activity).toEqual(
      expect.objectContaining({
        businessId: ids.businessId,
        actorUserId: null,
        type: "inquiry.submitted_public",
      }),
    );

    const [notification] = await testDb
      .select()
      .from(businessNotifications)
      .where(eq(businessNotifications.inquiryId, created.inquiryId));

    expect(notification).toEqual(
      expect.objectContaining({
        businessId: ids.businessId,
        type: "public_inquiry_submitted",
      }),
    );
  });

  it("creates manual inquiries as dashboard activity without public notifications", async () => {
    const business = await getPublicInquiryBusinessBySlug(ids.businessSlug);
    if (!business) {
      throw new Error("Expected seeded business to be public.");
    }

    const validation = validatePublicInquirySubmission(
      business.inquiryFormConfig,
      inquiryFormData("manual-customer@example.com"),
    );
    const submission = expectValidSubmission(validation);

    const created = await createManualInquirySubmission({
      business,
      submission,
      actorUserId: ids.ownerUserId,
    });

    const [storedInquiry] = await testDb
      .select()
      .from(inquiries)
      .where(eq(inquiries.id, created.inquiryId));

    expect(storedInquiry.source).toBe("manual-dashboard");

    const [activity] = await testDb
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.inquiryId, created.inquiryId));

    expect(activity).toEqual(
      expect.objectContaining({
        actorUserId: ids.ownerUserId,
        type: "inquiry.created_manual",
      }),
    );

    const notifications = await testDb
      .select()
      .from(businessNotifications)
      .where(eq(businessNotifications.inquiryId, created.inquiryId));

    expect(notifications).toHaveLength(0);
  });

  it("does not expose archived businesses for public inquiry intake", async () => {
    await expect(
      getPublicInquiryBusinessBySlug(ids.archivedBusinessSlug),
    ).resolves.toBeNull();
  });

  it("keeps inquiry notes scoped to the owning business", async () => {
    const wrongBusinessNote = await addInquiryNoteForBusiness({
      businessId: ids.otherBusinessId,
      inquiryId: ids.inquiryId,
      authorUserId: ids.ownerUserId,
      body: "This should not attach across businesses.",
    });

    expect(wrongBusinessNote).toBeNull();

    const note = await addInquiryNoteForBusiness({
      businessId: ids.businessId,
      inquiryId: ids.inquiryId,
      authorUserId: ids.ownerUserId,
      body: "Customer prefers installation next week.",
    });

    expect(note?.noteId).toMatch(/^note_/);

    const storedNotes = await testDb
      .select()
      .from(inquiryNotes)
      .where(
        and(
          eq(inquiryNotes.businessId, ids.businessId),
          eq(inquiryNotes.inquiryId, ids.inquiryId),
        ),
      );

    expect(storedNotes).toHaveLength(1);
    expect(storedNotes[0]).toEqual(
      expect.objectContaining({
        authorUserId: ids.ownerUserId,
        body: "Customer prefers installation next week.",
      }),
    );
  });
});
