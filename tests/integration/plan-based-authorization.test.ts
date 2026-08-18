import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");
  return { db: mockedDb };
});

/**
 * Plan-based authorization integration tests.
 *
 * Validates that server-side enforcement remains intact:
 * - Server actions reject unauthorized operations based on plan
 * - Users cannot bypass UI restrictions by calling endpoints directly
 * - Error messages clearly communicate upgrade requirements
 *
 * This ensures that making features visible in the UI (for discovery)
 * does not weaken actual authorization.
 */

import { createMemoryEntryAction } from "@/features/memory/actions";
import { hasFeatureAccess } from "@/lib/plans/entitlements";

import { closeTestDb, testDb } from "@/tests/support/db";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  type WorkflowFixtureIds,
} from "@/tests/support/fixtures/workflow";
import { businesses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const prefix = "test_plan_authz";
let ids: WorkflowFixtureIds;

describe("Plan-based authorization — server-side enforcement", () => {
  beforeAll(async () => {
    ids = await createWorkflowFixture(prefix);

    // Set business to free plan for testing
    await testDb
      .update(businesses)
      .set({ plan: "free", updatedAt: new Date() })
      .where(eq(businesses.id, ids.businessId));
  }, 30_000);

  afterAll(async () => {
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 30_000);

  describe("Knowledge base (knowledgeBase feature)", () => {
    it("rejects creation when free plan tries to create knowledge", async () => {
      const formData = new FormData();
      formData.set("title", "Test Knowledge");
      formData.set("content", "Test content");
      formData.set("category", "general");

      const result = await createMemoryEntryAction(
        ids.businessSlug,
        { error: "" },
        formData,
      );

      expect(result.error).toBeDefined();
      expect(result.error).toContain("plan does not include");
    });

    it("allows creation when business has Pro plan", async () => {
      // Upgrade to Pro
      await testDb
        .update(businesses)
        .set({ plan: "pro", updatedAt: new Date() })
        .where(eq(businesses.id, ids.businessId));

      const formData = new FormData();
      formData.set("title", "Pro Knowledge");
      formData.set("content", "Pro content");
      formData.set("category", "general");

      const result = await createMemoryEntryAction(
        ids.businessSlug,
        { error: "" },
        formData,
      );

      // Should not have plan error (may fail for other validation reasons)
      if (result.error) {
        expect(result.error).not.toContain("plan does not include");
      }

      // Restore to free
      await testDb
        .update(businesses)
        .set({ plan: "free", updatedAt: new Date() })
        .where(eq(businesses.id, ids.businessId));
    });
  });

  describe("Plan checks are immediate", () => {
    it("plan checks happen before expensive operations", async () => {
      const formData = new FormData();
      formData.set("title", "Expensive Knowledge");
      formData.set("content", "Very long content");
      formData.set("category", "general");

      const startTime = Date.now();
      const result = await createMemoryEntryAction(
        ids.businessSlug,
        { error: "" },
        formData,
      );
      const duration = Date.now() - startTime;

      // Plan check should reject quickly (< 100ms)
      expect(duration).toBeLessThan(100);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("plan does not include");
    });
  });

  describe("Plan transitions", () => {
    it("denies access immediately after downgrade", async () => {
      // Upgrade to Pro
      await testDb
        .update(businesses)
        .set({ plan: "pro", updatedAt: new Date() })
        .where(eq(businesses.id, ids.businessId));

      // Verify Pro access
      const formDataPro = new FormData();
      formDataPro.set("title", "Pro Knowledge");
      formDataPro.set("content", "Content");
      formDataPro.set("category", "general");

      const proPlanResult = await createMemoryEntryAction(
        ids.businessSlug,
        { error: "" },
        formDataPro,
      );

      if (proPlanResult.error) {
        expect(proPlanResult.error).not.toContain("plan does not include");
      }

      // Downgrade to Free
      await testDb
        .update(businesses)
        .set({ plan: "free", updatedAt: new Date() })
        .where(eq(businesses.id, ids.businessId));

      // Verify access immediately denied
      const formDataFree = new FormData();
      formDataFree.set("title", "Free Knowledge");
      formDataFree.set("content", "Content");
      formDataFree.set("category", "general");

      const freePlanResult = await createMemoryEntryAction(
        ids.businessSlug,
        { error: "" },
        formDataFree,
      );

      expect(freePlanResult.error).toBeDefined();
      expect(freePlanResult.error).toContain("plan does not include");
    });

    it("grants access immediately after upgrade", async () => {
      // Start with Free
      await testDb
        .update(businesses)
        .set({ plan: "free", updatedAt: new Date() })
        .where(eq(businesses.id, ids.businessId));

      // Verify denied on free
      const formDataFree = new FormData();
      formDataFree.set("title", "Free");
      formDataFree.set("content", "Content");
      formDataFree.set("category", "general");

      const freePlanResult = await createMemoryEntryAction(
        ids.businessSlug,
        { error: "" },
        formDataFree,
      );

      expect(freePlanResult.error).toBeDefined();
      expect(freePlanResult.error).toContain("plan does not include");

      // Upgrade to Pro
      await testDb
        .update(businesses)
        .set({ plan: "pro", updatedAt: new Date() })
        .where(eq(businesses.id, ids.businessId));

      // Verify immediately granted
      const formDataPro = new FormData();
      formDataPro.set("title", "Pro");
      formDataPro.set("content", "Content");
      formDataPro.set("category", "general");

      const proPlanResult = await createMemoryEntryAction(
        ids.businessSlug,
        { error: "" },
        formDataPro,
      );

      if (proPlanResult.error) {
        expect(proPlanResult.error).not.toContain("plan does not include");
      }
    });
  });

  describe("Business plan bypass", () => {
    it("business plan has access to all features", async () => {
      // Upgrade to Business
      await testDb
        .update(businesses)
        .set({ plan: "business", updatedAt: new Date() })
        .where(eq(businesses.id, ids.businessId));

      const formData = new FormData();
      formData.set("title", "Business Knowledge");
      formData.set("content", "Content");
      formData.set("category", "general");

      const result = await createMemoryEntryAction(
        ids.businessSlug,
        { error: "" },
        formData,
      );

      // Should not have plan errors
      if (result.error) {
        expect(result.error).not.toContain("plan does not include");
        expect(result.error).not.toContain("Upgrade to");
      }

      // Restore to free
      await testDb
        .update(businesses)
        .set({ plan: "free", updatedAt: new Date() })
        .where(eq(businesses.id, ids.businessId));
    });
  });

  describe("Entitlement helper consistency", () => {
    it("hasFeatureAccess matches server-side behavior", async () => {
      // Test free plan
      await testDb
        .update(businesses)
        .set({ plan: "free", updatedAt: new Date() })
        .where(eq(businesses.id, ids.businessId));

      const freePlanHasAccess = hasFeatureAccess("free", "knowledgeBase");
      expect(freePlanHasAccess).toBe(false);

      // Test pro plan
      const proPlanHasAccess = hasFeatureAccess("pro", "knowledgeBase");
      expect(proPlanHasAccess).toBe(true);

      // Test business plan
      const businessPlanHasAccess = hasFeatureAccess("business", "knowledgeBase");
      expect(businessPlanHasAccess).toBe(true);
    });
  });
});

