import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, like } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

// Public token decisions are rate-limited on IP + user-agent; mirror visitor
// headers since direct mutation calls have no Next request scope.
vi.mock("next/headers", () => ({
  headers: vi.fn(
    async () =>
      new Headers({
        "x-forwarded-for": "203.0.113.10",
        "user-agent": "workflow-test-browser",
      }),
  ),
}));

import {
  decideApprovalByToken,
  requestApprovalForBusiness,
  resubmitApprovalVersionForBusiness,
} from "@/features/approvals/mutations";
import { uploadApprovalArtifactForBusiness } from "@/features/approvals/artifacts";
import { createBusinessForUser } from "@/features/businesses/mutations";
import {
  approvalArtifacts,
  approvalChains,
  approvals,
  auditLogs,
  businessMembers,
  businessPackAssignmentHistory,
  businessPackAssignments,
  businesses,
  packRecipes,
  profiles,
  user,
} from "@/lib/db/schema";

import { closeTestDb, testDb } from "@/tests/support/db";

const prefix = "test_approvals";
const now = new Date("2026-05-07T00:00:00.000Z");

function slug(value: string) {
  return value.replace(/_/g, "-");
}

async function cleanup() {
  await testDb.delete(approvals).where(like(approvals.businessId, `${prefix}%`));
  await testDb.delete(approvalChains).where(like(approvalChains.businessId, `${prefix}%`));
  await testDb.delete(approvalArtifacts).where(like(approvalArtifacts.businessId, `${prefix}%`));
  await testDb.delete(auditLogs).where(like(auditLogs.businessId, `${prefix}%`));
  await testDb.delete(packRecipes).where(like(packRecipes.businessId, `${prefix}%`));
  await testDb
    .delete(businessPackAssignmentHistory)
    .where(like(businessPackAssignmentHistory.businessId, `${prefix}%`));
  await testDb
    .delete(businessPackAssignments)
    .where(like(businessPackAssignments.businessId, `${prefix}%`));
  await testDb.delete(businessMembers).where(like(businessMembers.userId, `${prefix}%`));
  await testDb.delete(businesses).where(like(businesses.ownerUserId, `${prefix}%`));
  await testDb.delete(profiles).where(like(profiles.userId, `${prefix}%`));
  await testDb.delete(user).where(like(user.id, `${prefix}%`));
}

async function setupBusiness(suffix: string) {
  const userId = `${prefix}_owner_${suffix}`;
  const name = `${prefix}_biz_${suffix}`;

  await testDb.insert(user).values({
    id: userId,
    name: "Approval Owner",
    email: `${userId}@example.com`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });

  await createBusinessForUser({
    user: { id: userId, name: "Approval Owner", email: `${userId}@example.com` },
    businessId: slug(name),
    defaultCurrency: "USD",
    name,
    businessType: "fabrication_custom_build",
    plan: "free",
  });

  return { userId, businessId: slug(name) };
}

describe("approvals", () => {
  beforeEach(async () => {
    await cleanup();
  }, 30_000);

  afterAll(async () => {
    await cleanup();
    await closeTestDb();
  }, 30_000);

  it("requests a hold confirmation and the customer approves with attestation", async () => {
    const { userId, businessId } = await setupBusiness("h1");

    const { newEntityId } = await import("@/lib/ids");
    const { inquiries } = await import("@/lib/db/schema");

    const inquiryId = newEntityId();
    await testDb.insert(inquiries).values({
      id: inquiryId,
      businessId,
      status: "new",
      customerName: "Holly",
      customerEmail: "holly@example.com",
      customerContactMethod: "email",
      customerContactHandle: "holly@example.com",
      details: "Hold request.",
      createdAt: now,
      updatedAt: now,
    } as never);

    const requested = await requestApprovalForBusiness({
      businessId,
      subjectType: "hold_confirmation",
      inquiryId,
      title: "Hold the date",
      state: { date: "2026-09-01" },
      requesterUserId: userId,
      requesterRole: "owner",
    });

    expect(requested.chainId).toBeDefined();
    expect(requested.customerToken).toHaveLength(20);

    const decided = await decideApprovalByToken({
      token: requested.customerToken,
      decision: "approved",
      approverName: "Holly Day",
    });

    expect(decided.state).toBe("approved");

    const audits = await testDb
      .select({ action: auditLogs.action })
      .from(auditLogs)
      .where(eq(auditLogs.businessId, businessId));

    expect(audits.map((row) => row.action)).toContain("approval.requested");
    expect(audits.map((row) => row.action)).toContain("approval.decided");

    await testDb.delete(inquiries).where(eq(inquiries.id, inquiryId));
  }, 30_000);

  it("enforces subject-target contracts and rejects dangling references", async () => {
    const { userId, businessId } = await setupBusiness("c1");

    // final_count without a quote: rejected.
    await expect(
      requestApprovalForBusiness({
        businessId,
        subjectType: "final_count",
        title: "Count",
        state: {},
        requesterUserId: userId,
        requesterRole: "staff",
      }),
    ).rejects.toThrow("does not match");

    // Dangling artifact: rejected.
    await expect(
      requestApprovalForBusiness({
        businessId,
        subjectType: "proof",
        quoteId: "missing",
        artifactId: "missing-artifact",
        title: "Proof",
        state: {},
        requesterUserId: userId,
        requesterRole: "staff",
      }),
    ).rejects.toThrow();

    // Proof without artifact: rejected.
    const { businessId: otherBiz } = await setupBusiness("c2");
    await expect(
      requestApprovalForBusiness({
        businessId: otherBiz,
        subjectType: "proof",
        inquiryId: "missing",
        title: "Proof",
        state: {},
        requesterUserId: userId,
        requesterRole: "staff",
      }),
    ).rejects.toThrow();
  }, 30_000);

  it("cross-tenant subject references 404", async () => {
    const a = await setupBusiness("x1");
    const b = await setupBusiness("x2");

    const { newEntityId } = await import("@/lib/ids");
    const { inquiries } = await import("@/lib/db/schema");

    const inquiryId = newEntityId();
    await testDb.insert(inquiries).values({
      id: inquiryId,
      businessId: b.businessId,
      status: "new",
      customerName: "Cross",
      customerEmail: "cross@example.com",
      customerContactMethod: "email",
      customerContactHandle: "cross@example.com",
      details: "Cross-tenant probe.",
      createdAt: now,
      updatedAt: now,
    } as never);

    await expect(
      requestApprovalForBusiness({
        businessId: a.businessId,
        subjectType: "hold_confirmation",
        inquiryId,
        title: "Hold",
        state: {},
        requesterUserId: a.userId,
        requesterRole: "owner",
      }),
    ).rejects.toThrow("Inquiry not found");

    await testDb.delete(inquiries).where(eq(inquiries.id, inquiryId));
  }, 30_000);

  it("decides via token with replay safety and stale rejection", async () => {
    const { userId, businessId } = await setupBusiness("d1");

    const { newEntityId } = await import("@/lib/ids");
    const { inquiries } = await import("@/lib/db/schema");

    const inquiryId = newEntityId();
    await testDb.insert(inquiries).values({
      id: inquiryId,
      businessId,
      status: "new",
      customerName: "Dana",
      customerEmail: "dana@example.com",
      customerContactMethod: "email",
      customerContactHandle: "dana@example.com",
      details: "Hold request.",
      createdAt: now,
      updatedAt: now,
    } as never);

    const requested = await requestApprovalForBusiness({
      businessId,
      subjectType: "hold_confirmation",
      inquiryId,
      title: "Hold the date",
      state: { date: "2026-08-01" },
      requesterUserId: userId,
      requesterRole: "owner",
    });

    // Attestation required: anonymous approve rejected.
    await expect(
      decideApprovalByToken({ token: requested.customerToken, decision: "approved" }),
    ).rejects.toThrow("full name");

    // Changes require a comment.
    await expect(
      decideApprovalByToken({ token: requested.customerToken, decision: "changes_requested" }),
    ).rejects.toThrow("describe");

    const decided = await decideApprovalByToken({
      token: requested.customerToken,
      decision: "approved",
      approverName: "Dana Lee",
    });

    expect(decided.state).toBe("approved");

    // Replay returns state, never double-writes.
    const replayed = await decideApprovalByToken({
      token: requested.customerToken,
      decision: "approved",
      approverName: "Dana Lee",
    });

    expect(replayed).toMatchObject({ decided: true, state: "approved" });

    const history = await testDb
      .select({ state: approvals.state })
      .from(approvals)
      .where(eq(approvals.chainId, requested.chainId));

    expect(history.filter((row) => row.state === "approved")).toHaveLength(1);

    await testDb.delete(inquiries).where(eq(inquiries.id, inquiryId));
  }, 30_000);

  it("resubmits new versions with supersession, never un-approval", async () => {
    const { userId, businessId } = await setupBusiness("r1");

    const { newEntityId } = await import("@/lib/ids");
    const { inquiries } = await import("@/lib/db/schema");

    const inquiryId = newEntityId();
    await testDb.insert(inquiries).values({
      id: inquiryId,
      businessId,
      status: "new",
      customerName: "Rae",
      customerEmail: "rae@example.com",
      customerContactMethod: "email",
      customerContactHandle: "rae@example.com",
      details: "Hold request.",
      createdAt: now,
      updatedAt: now,
    } as never);

    const requested = await requestApprovalForBusiness({
      businessId,
      subjectType: "hold_confirmation",
      inquiryId,
      title: "Hold",
      state: {},
      requesterUserId: userId,
      requesterRole: "owner",
    });

    await decideApprovalByToken({
      token: requested.customerToken,
      decision: "changes_requested",
      comment: "Move it a week later.",
    });

    const resubmitted = await resubmitApprovalVersionForBusiness({
      businessId,
      chainId: requested.chainId,
      requesterUserId: userId,
      requesterRole: "owner",
    });

    expect(resubmitted.version).toBe(2);

    const versions = await testDb
      .select({ version: approvals.version, state: approvals.state, decidedAt: approvals.decidedAt })
      .from(approvals)
      .where(eq(approvals.chainId, requested.chainId));

    expect(versions.find((row) => row.version === 1)?.state).toBe("superseded");
    expect(versions.find((row) => row.version === 1)?.decidedAt).not.toBeNull();
    expect(versions.find((row) => row.version === 2)?.state).toBe("pending");

    await testDb.delete(inquiries).where(eq(inquiries.id, inquiryId));
  }, 30_000);

  it("upload helper validates size through the shared choke point", async () => {
    const { userId, businessId } = await setupBusiness("u1");

    const big = new File([new Uint8Array(26 * 1024 * 1024)], "big.pdf", {
      type: "application/pdf",
    });

    await expect(
      uploadApprovalArtifactForBusiness({ businessId, uploaderUserId: userId, file: big }),
    ).rejects.toThrow("25MB");
  }, 30_000);
});
