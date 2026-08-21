import { describe, expect, it } from "vitest";

import { hasFeatureAccess, getRequiredPlan } from "@/lib/plans/entitlements";
import { getUpgradePlan, isBusinessPlan } from "@/lib/plans/plans";
import { getUsageLimit, isUsageLimited } from "@/lib/plans/usage-limits";

describe("business plan access", () => {
  it("keeps the complete core workflow on free with one business", () => {
    expect(isBusinessPlan("free")).toBe(true);
    expect(isBusinessPlan("enterprise")).toBe(false);
    expect(getUpgradePlan("free")).toBe("pro");

    expect(getUsageLimit("free", "freeBusinessesPerOwner")).toBe(1);
    expect(getUsageLimit("free", "aiWeightedCreditsPerMonth")).toBe(30);
    expect(getUsageLimit("free", "requoQuoteEmailsPerDay")).toBe(3);
    expect(getUsageLimit("free", "requoQuoteEmailsPerMonth")).toBe(15);
    expect(getUsageLimit("free", "customFieldsPerForm")).toBe(3);
    expect(getUsageLimit("free", "productEntriesPerBusiness")).toBe(10);
    expect(getUsageLimit("free", "knowledgeSourcesPerBusiness")).toBe(5);
    expect(getUsageLimit("free", "liveFormsPerBusiness")).toBe(1);
    expect(getUsageLimit("free", "membersPerBusiness")).toBe(1);
    expect(getUsageLimit("free", "publicInquiryAttachmentMaxBytes")).toBe(
      5 * 1024 * 1024,
    );
    expect(hasFeatureAccess("free", "followUps")).toBe(true);
    expect(hasFeatureAccess("free", "quoteLibrary")).toBe(true);
    expect(hasFeatureAccess("free", "knowledgeBase")).toBe(true);
    expect(hasFeatureAccess("free", "aiQuoteDrafting")).toBe(true);
    expect(hasFeatureAccess("free", "exports")).toBe(true);
    expect(hasFeatureAccess("free", "analyticsConversion")).toBe(false);
    expect(hasFeatureAccess("free", "removeWatermark")).toBe(false);
    expect(hasFeatureAccess("free", "autoFollowUps")).toBe(false);
  });

  it("unlocks time-saving and presentation features on pro without enabling team roles", () => {
    expect(isUsageLimited("pro", "aiWeightedCreditsPerMonth")).toBe(true);
    expect(isUsageLimited("pro", "requoQuoteEmailsPerDay")).toBe(true);
    expect(getUsageLimit("pro", "requoQuoteEmailsPerDay")).toBe(20);
    expect(getUsageLimit("pro", "aiWeightedCreditsPerMonth")).toBe(150);
    expect(getUsageLimit("pro", "liveFormsPerBusiness")).toBe(5);
    expect(getUsageLimit("pro", "productEntriesPerBusiness")).toBe(50);
    expect(getUsageLimit("pro", "knowledgeSourcesPerBusiness")).toBe(25);
    expect(getUsageLimit("pro", "customFieldsPerForm")).toBe(10);
    expect(getUsageLimit("pro", "publicInquiryAttachmentMaxBytes")).toBe(
      25 * 1024 * 1024,
    );
    expect(hasFeatureAccess("pro", "exports")).toBe(true);
    expect(hasFeatureAccess("pro", "emailTemplates")).toBe(true);
    expect(hasFeatureAccess("pro", "multipleForms")).toBe(true);
    expect(hasFeatureAccess("pro", "inquiryPageCustomization")).toBe(true);
    expect(hasFeatureAccess("pro", "analyticsConversion")).toBe(true);
    expect(hasFeatureAccess("pro", "analyticsWorkflow")).toBe(true);
    expect(hasFeatureAccess("pro", "autoFollowUps")).toBe(true);
    expect(hasFeatureAccess("pro", "removeWatermark")).toBe(true);
    expect(hasFeatureAccess("pro", "members")).toBe(false);
    expect(hasFeatureAccess("pro", "auditLogs")).toBe(false);
    expect(getRequiredPlan("members")).toBe("business");
  });

  it("reserves member collaboration and audit logs for the business plan", () => {
    expect(getUpgradePlan("business")).toBeNull();
    expect(hasFeatureAccess("business", "members")).toBe(true);
    expect(hasFeatureAccess("business", "auditLogs")).toBe(true);
    expect(getRequiredPlan("auditLogs")).toBe("business");
    expect(getUsageLimit("business", "membersPerBusiness")).toBe(5);
    expect(getUsageLimit("business", "liveFormsPerBusiness")).toBe(10);
    expect(getUsageLimit("business", "aiWeightedCreditsPerMonth")).toBe(500);
    expect(getUsageLimit("business", "requoQuoteEmailsPerMonth")).toBe(500);
    expect(getUsageLimit("business", "customFieldsPerForm")).toBe(24);
    expect(getUsageLimit("business", "publicInquiryAttachmentMaxBytes")).toBe(
      50 * 1024 * 1024,
    );
    expect(getUsageLimit("business", "productEntriesPerBusiness")).toBeNull();
  });

  it("leaves core records and manual follow-ups uncapped", () => {
    expect(hasFeatureAccess("free", "exports")).toBe(true);
    expect(hasFeatureAccess("pro", "exports")).toBe(true);
    expect(hasFeatureAccess("business", "exports")).toBe(true);
    expect(getUsageLimit("free", "membersPerBusiness")).toBe(1);
    expect(getUsageLimit("pro", "membersPerBusiness")).toBe(1);
  });
});
