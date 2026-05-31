import { describe, expect, it } from "vitest";

import { hasFeatureAccess, getRequiredPlan } from "@/lib/plans/entitlements";
import { getUpgradePlan, isBusinessPlan } from "@/lib/plans/plans";
import { getUsageLimit, isUsageLimited } from "@/lib/plans/usage-limits";

describe("business plan access", () => {
  it("keeps owner-led free limits tight while preserving the upgrade path", () => {
    expect(isBusinessPlan("free")).toBe(true);
    expect(isBusinessPlan("enterprise")).toBe(false);
    expect(getUpgradePlan("free")).toBe("pro");

    expect(getUsageLimit("free", "businessesPerPlan")).toBe(2);
    expect(getUsageLimit("free", "inquiriesPerMonth")).toBeNull();
    expect(getUsageLimit("free", "quotesPerMonth")).toBeNull();
    expect(getUsageLimit("free", "requoQuoteEmailsPerDay")).toBe(3);
    expect(getUsageLimit("free", "customFieldsPerForm")).toBe(3);
    expect(getUsageLimit("free", "activeFollowUps")).toBe(3);
    expect(getUsageLimit("free", "memoriesPerBusiness")).toBe(5);
    expect(getUsageLimit("free", "pricingEntriesPerBusiness")).toBe(10);
    expect(getUsageLimit("free", "publicInquiryAttachmentMaxBytes")).toBe(
      5 * 1024 * 1024,
    );
    expect(hasFeatureAccess("free", "attachments")).toBe(true);
    expect(hasFeatureAccess("free", "customerHistory")).toBe(true);
    expect(hasFeatureAccess("free", "followUps")).toBe(true);
    expect(hasFeatureAccess("free", "knowledgeBase")).toBe(true);
    expect(hasFeatureAccess("free", "quoteLibrary")).toBe(true);
    expect(hasFeatureAccess("free", "automations")).toBe(true);
    expect(hasFeatureAccess("free", "analyticsConversion")).toBe(false);
    expect(hasFeatureAccess("free", "exports")).toBe(false);
    expect(hasFeatureAccess("free", "removeWatermark")).toBe(false);
  });

  it("unlocks core operator features on pro without enabling team roles", () => {
    expect(isUsageLimited("pro", "quotesPerMonth")).toBe(false);
    expect(isUsageLimited("pro", "requoQuoteEmailsPerDay")).toBe(true);
    expect(getUsageLimit("pro", "requoQuoteEmailsPerDay")).toBe(20);
    expect(getUsageLimit("pro", "businessesPerPlan")).toBe(5);
    expect(getUsageLimit("pro", "customFieldsPerForm")).toBe(10);
    expect(getUsageLimit("pro", "publicInquiryAttachmentMaxBytes")).toBe(
      25 * 1024 * 1024,
    );
    expect(hasFeatureAccess("pro", "exports")).toBe(true);
    expect(hasFeatureAccess("pro", "emailTemplates")).toBe(true);
    expect(hasFeatureAccess("pro", "customerHistory")).toBe(true);
    expect(hasFeatureAccess("pro", "removeWatermark")).toBe(true);
    expect(hasFeatureAccess("pro", "workflowBuilder")).toBe(true);
    expect(hasFeatureAccess("pro", "members")).toBe(false);
    expect(getRequiredPlan("members")).toBe("business");
  });

  it("reserves member collaboration for the business plan", () => {
    expect(getUpgradePlan("business")).toBeNull();
    expect(hasFeatureAccess("business", "members")).toBe(true);
    expect(getUsageLimit("business", "businessesPerPlan")).toBe(10);
    expect(getUsageLimit("business", "membersPerBusiness")).toBe(25);
    expect(getUsageLimit("business", "customFieldsPerForm")).toBe(24);
    expect(getUsageLimit("business", "publicInquiryAttachmentMaxBytes")).toBe(
      50 * 1024 * 1024,
    );
  });
});
