import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

import { closeTestDb, testDb } from "@/tests/support/db";
import { profiles, user } from "@/lib/db/schema";
import { getUserProfileCacheTags } from "@/lib/cache/shell-tags";

const { updateTagMock, updateUserMock } = vi.hoisted(() => ({
  updateTagMock: vi.fn(),
  updateUserMock: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({ db: testDb }));
vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: updateTagMock,
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ delete: vi.fn() }),
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock("@/lib/auth/server", () => ({
  auth: { api: { updateUser: updateUserMock } },
}));

const userId = "test_user_account_profile";

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn().mockResolvedValue({
    id: "test_user_account_profile",
    name: "Maria Santos",
    email: "test.profile@example.com",
  }),
}));

vi.mock("@/lib/auth/business-bootstrap", () => ({
  ensureProfileForUser: vi.fn().mockResolvedValue(undefined),
}));

const { updateAccountProfileAction } = await import(
  "@/features/account/actions"
);

function buildNameOnlySubmission(fullName: string) {
  const formData = new FormData();

  // Exactly what the profile settings form posts: name + avatar intent only.
  // No jobTitle/phone — the page renders no input for them.
  formData.set("fullName", fullName);
  formData.set("removeAvatar", "false");

  return formData;
}

describe("features/account/actions updateAccountProfileAction", () => {
  beforeAll(async () => {
    await testDb.delete(profiles).where(eq(profiles.userId, userId));
    await testDb.delete(user).where(eq(user.id, userId));

    const now = new Date();

    await testDb.insert(user).values({
      id: userId,
      name: "Maria Santos",
      email: "test.profile@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    // `jobTitle` NULL is the normal state for OAuth sign-ups and for anyone
    // who skipped the optional onboarding field.
    await testDb.insert(profiles).values({
      userId,
      fullName: "Maria Santos",
      firstName: "Maria",
      lastName: "Santos",
      jobTitle: null,
      phone: null,
      createdAt: now,
      updatedAt: now,
    });
  });

  afterAll(async () => {
    await testDb.delete(profiles).where(eq(profiles.userId, userId));
    await testDb.delete(user).where(eq(user.id, userId));
    await closeTestDb();
  });

  it("saves a name-only submission when job_title is NULL", async () => {
    updateUserMock.mockClear();

    const state = await updateAccountProfileAction(
      {},
      buildNameOnlySubmission("Maria Q Santos"),
    );

    expect(state.fieldErrors).toBeUndefined();
    expect(state.error).toBeUndefined();
    expect(state.success).toBe("Profile saved.");
    expect(updateUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ body: { name: "Maria Q Santos" } }),
    );
  });

  it("writes the name and leaves job_title/phone untouched", async () => {
    const [row] = await testDb
      .select({
        fullName: profiles.fullName,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        jobTitle: profiles.jobTitle,
        phone: profiles.phone,
      })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    expect(row?.fullName).toBe("Maria Q Santos");
    expect(row?.firstName).toBe("Maria");
    expect(row?.lastName).toBe("Q Santos");
    // Deferred onboarding fields the profile page has no input for must not be
    // clobbered by a name save.
    expect(row?.jobTitle).toBeNull();
    expect(row?.phone).toBeNull();
  });

  it("expires the cached profile tags so the save is visible immediately", async () => {
    updateTagMock.mockClear();

    await updateAccountProfileAction({}, buildNameOnlySubmission("Maria R Santos"));

    // `getAccountProfileForUser` is a "use cache" read with a 120s stale window;
    // without this the page keeps rendering the previous name after a save.
    for (const tag of getUserProfileCacheTags(userId)) {
      expect(updateTagMock).toHaveBeenCalledWith(tag);
    }
  });
});
