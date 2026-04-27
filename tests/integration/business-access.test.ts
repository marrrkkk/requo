import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  currentUserId: "test_workflow_access_owner",
}));

vi.mock("react", () => ({
  cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("./db");

  return { db: mockedDb };
});

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => ({ value: "test-workflow-access-business" })),
  })),
}));

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(async () => ({
    id: authState.currentUserId,
    name: "Workflow Test User",
    email: `${authState.currentUserId}@example.com`,
  })),
  getOptionalSession: vi.fn(async () => ({
    user: {
      id: authState.currentUserId,
      name: "Workflow Test User",
      email: `${authState.currentUserId}@example.com`,
    },
  })),
}));

import {
  getBusinessActionContext,
  getBusinessRequestContextForSlug,
  getWorkspaceBusinessActionContext,
} from "@/lib/db/business-access";

import { closeTestDb } from "./db";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  type WorkflowFixtureIds,
} from "./workflow-fixtures";

const prefix = "test_workflow_access";
let ids: WorkflowFixtureIds;

describe("business and workspace access control", () => {
  beforeAll(async () => {
    ids = await createWorkflowFixture(prefix);
  }, 30_000);

  beforeEach(() => {
    authState.currentUserId = ids.ownerUserId;
  });

  afterAll(async () => {
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 30_000);

  it("allows staff-level business reads only for members of the requested business", async () => {
    authState.currentUserId = ids.staffUserId;

    const staffContext = await getBusinessActionContext({
      businessSlug: ids.businessSlug,
      minimumRole: "staff",
      requireActiveBusiness: true,
    });

    expect(staffContext.ok).toBe(true);
    if (staffContext.ok) {
      expect(staffContext.businessContext.business.id).toBe(ids.businessId);
      expect(staffContext.businessContext.role).toBe("staff");
    }

    authState.currentUserId = ids.outsiderUserId;

    const outsiderContext = await getBusinessActionContext({
      businessSlug: ids.businessSlug,
      minimumRole: "staff",
      requireActiveBusiness: true,
    });

    expect(outsiderContext).toEqual({
      ok: false,
      error: "Create a business first, then try again.",
    });
  });

  it("enforces business role thresholds for operational actions", async () => {
    authState.currentUserId = ids.staffUserId;

    await expect(
      getBusinessActionContext({
        businessSlug: ids.businessSlug,
        minimumRole: "manager",
        requireActiveBusiness: true,
      }),
    ).resolves.toEqual({
      ok: false,
      error: "Manager access is required for that action.",
    });

    authState.currentUserId = ids.managerUserId;

    const managerContext = await getBusinessActionContext({
      businessSlug: ids.businessSlug,
      minimumRole: "manager",
      requireActiveBusiness: true,
    });

    expect(managerContext.ok).toBe(true);
    if (managerContext.ok) {
      expect(managerContext.businessContext.role).toBe("manager");
    }
  });

  it("blocks active-only actions for archived businesses", async () => {
    const ownerArchivedContext = await getBusinessActionContext({
      businessSlug: ids.archivedBusinessSlug,
      minimumRole: "owner",
      requireActiveBusiness: false,
    });

    expect(ownerArchivedContext.ok).toBe(true);

    const activeOnlyContext = await getBusinessActionContext({
      businessSlug: ids.archivedBusinessSlug,
      minimumRole: "owner",
      requireActiveBusiness: true,
    });

    expect(activeOnlyContext).toEqual({
      ok: false,
      error: "Restore this business before doing that.",
    });
  });

  it("scopes route-handler request context by the authenticated user's business membership", async () => {
    const ownerContext = await getBusinessRequestContextForSlug(ids.businessSlug);

    expect(ownerContext?.businessContext.business.id).toBe(ids.businessId);

    authState.currentUserId = ids.outsiderUserId;

    const outsiderContext = await getBusinessRequestContextForSlug(
      ids.businessSlug,
    );

    expect(outsiderContext).toBeNull();
  });

  it("resolves the active business cookie through the same active membership rules", async () => {
    authState.currentUserId = ids.ownerUserId;

    const context = await getWorkspaceBusinessActionContext();

    expect(context.ok).toBe(true);
    if (context.ok) {
      expect(context.businessContext.business.id).toBe(ids.businessId);
    }
  });
});
