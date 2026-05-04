import { describe, expect, it } from "vitest";

import { hasFeatureAccess, getRequiredPlan } from "@/lib/plans/entitlements";
import { getUpgradePlan, isWorkspacePlan } from "@/lib/plans/plans";
import { getUsageLimit, isUsageLimited } from "@/lib/plans/usage-limits";

describe("workspace plan access", () => {
  it("keeps owner-led free limits tight while preserving the upgrade path", () => {
    expect(isWorkspacePlan("free")).toBe(true);
    expect(isWorkspacePlan("enterprise")).toBe(false);
    expect(getUpgradePlan("free")).toBe("pro");

    expect(getUsageLimit("free", "businessesPerWorkspace")).toBe(1);
    expect(getUsageLimit("free", "inquiriesPerMonth")).toBe(100);
    expect(getUsageLimit("free", "quotesPerMonth")).toBe(50);
    expect(getUsageLimit("free", "requoQuoteEmailsPerDay")).toBe(3);
    expect(getUsageLimit("free", "customFieldsPerForm")).toBe(4);
    expect(getUsageLimit("free", "publicInquiryAttachmentMaxBytes")).toBe(
      5 * 1024 * 1024,
    );
    expect(hasFeatureAccess("free", "attachments")).toBe(true);
    expect(hasFeatureAccess("free", "exports")).toBe(false);
    expect(hasFeatureAccess("free", "branding")).toBe(false);
    expect(hasFeatureAccess("free", "multiBusiness")).toBe(false);
  });

  it("unlocks core operator features on pro without enabling team roles", () => {
    expect(isUsageLimited("pro", "quotesPerMonth")).toBe(false);
    expect(isUsageLimited("pro", "requoQuoteEmailsPerDay")).toBe(false);
    expect(getUsageLimit("pro", "businessesPerWorkspace")).toBe(10);
    expect(getUsageLimit("pro", "customFieldsPerForm")).toBe(12);
    expect(getUsageLimit("pro", "publicInquiryAttachmentMaxBytes")).toBe(
      25 * 1024 * 1024,
    );
    expect(hasFeatureAccess("pro", "exports")).toBe(true);
    expect(hasFeatureAccess("pro", "emailTemplates")).toBe(true);
    expect(hasFeatureAccess("pro", "customerHistory")).toBe(true);
    expect(hasFeatureAccess("pro", "pushNotifications")).toBe(true);
    expect(hasFeatureAccess("pro", "branding")).toBe(true);
    expect(hasFeatureAccess("pro", "multiBusiness")).toBe(true);
    expect(hasFeatureAccess("pro", "members")).toBe(false);
    expect(getRequiredPlan("members")).toBe("business");
  });

  it("reserves workspace member collaboration for the business plan", () => {
    expect(getUpgradePlan("business")).toBeNull();
    expect(hasFeatureAccess("business", "members")).toBe(true);
    expect(getUsageLimit("business", "businessesPerWorkspace")).toBeNull();
    expect(getUsageLimit("business", "membersPerWorkspace")).toBe(25);
    expect(getUsageLimit("business", "customFieldsPerForm")).toBe(24);
    expect(getUsageLimit("business", "publicInquiryAttachmentMaxBytes")).toBe(
      50 * 1024 * 1024,
    );
  });
});
