import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";

const { authState, revalidatePathMock, updateTagMock } = vi.hoisted(() => ({
  authState: {
    currentUserId: "test_recent_businesses_owner",
  },
  revalidatePathMock: vi.fn(),
  updateTagMock: vi.fn(),
}));

vi.mock("react", () => ({
  cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("./db");

  return { db: mockedDb };
});

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(async () => ({
    id: authState.currentUserId,
    name: "Recent Business Test User",
    email: `${authState.currentUserId}@example.com`,
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  updateTag: updateTagMock,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    delete: vi.fn(),
    get: vi.fn(() => null),
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`Unexpected redirect to ${path}`);
  }),
}));

import { recordRecentlyOpenedBusinessAction } from "@/features/businesses/actions";
import {
  getRecentlyOpenedBusinessesForUser,
  recordRecentlyOpenedBusiness,
} from "@/features/businesses/recently-opened";
import { userRecentBusinesses } from "@/lib/db/schema";
import { workspacesHubPath } from "@/features/workspaces/routes";

import { closeTestDb, testDb } from "./db";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  type WorkflowFixtureIds,
} from "./workflow-fixtures";

const prefix = "test_recent_businesses";
let ids: WorkflowFixtureIds;

async function clearRecentBusinesses() {
  await testDb
    .delete(userRecentBusinesses)
    .where(
      inArray(userRecentBusinesses.userId, [
        ids.ownerUserId,
        ids.managerUserId,
        ids.staffUserId,
        ids.outsiderUserId,
      ]),
    );
}

describe("recently opened businesses", () => {
  beforeAll(async () => {
    ids = await createWorkflowFixture(prefix);
  }, 30_000);

  beforeEach(async () => {
    authState.currentUserId = ids.ownerUserId;
    revalidatePathMock.mockClear();
    updateTagMock.mockClear();
    await clearRecentBusinesses();
  });

  afterAll(async () => {
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 30_000);

  it("returns server-saved businesses in most-recent order for the account", async () => {
    await recordRecentlyOpenedBusiness({
      businessId: ids.businessId,
      openedAt: new Date("2026-05-01T10:00:00.000Z"),
      userId: ids.ownerUserId,
    });
    await recordRecentlyOpenedBusiness({
      businessId: ids.archivedBusinessId,
      openedAt: new Date("2026-05-01T11:00:00.000Z"),
      userId: ids.ownerUserId,
    });

    let recents = await getRecentlyOpenedBusinessesForUser(ids.ownerUserId);

    expect(recents.map((business) => business.slug)).toEqual([
      ids.archivedBusinessSlug,
      ids.businessSlug,
    ]);

    await recordRecentlyOpenedBusiness({
      businessId: ids.businessId,
      openedAt: new Date("2026-05-01T12:00:00.000Z"),
      userId: ids.ownerUserId,
    });

    recents = await getRecentlyOpenedBusinessesForUser(ids.ownerUserId);

    expect(recents.map((business) => business.slug)).toEqual([
      ids.businessSlug,
      ids.archivedBusinessSlug,
    ]);
  });

  it("records opens through the authenticated server action only for accessible businesses", async () => {
    await expect(
      recordRecentlyOpenedBusinessAction(ids.businessSlug),
    ).resolves.toEqual({ ok: true });

    await expect(
      recordRecentlyOpenedBusinessAction(ids.otherBusinessSlug),
    ).resolves.toEqual({ ok: false });

    const recents = await getRecentlyOpenedBusinessesForUser(ids.ownerUserId);

    expect(recents.map((business) => business.slug)).toEqual([
      ids.businessSlug,
    ]);
    expect(revalidatePathMock).toHaveBeenCalledWith(workspacesHubPath);

    const rows = await testDb
      .select({
        businessId: userRecentBusinesses.businessId,
        userId: userRecentBusinesses.userId,
      })
      .from(userRecentBusinesses)
      .where(eq(userRecentBusinesses.userId, ids.ownerUserId));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      businessId: ids.businessId,
      userId: ids.ownerUserId,
    });
  });
});
