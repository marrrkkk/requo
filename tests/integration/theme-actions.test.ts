import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

import { closeTestDb, testDb } from "@/tests/support/db";
import { profiles, user } from "@/lib/db/schema";
import { getUserThemeCacheTags } from "@/lib/cache/shell-tags";
import { updateThemePreferenceAction } from "@/features/theme/actions";

const { revalidateTagMock } = vi.hoisted(() => ({
  revalidateTagMock: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({ db: testDb }));
vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: revalidateTagMock,
  updateTag: vi.fn(),
}));

const userId = "test_user_theme_preference";

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn().mockResolvedValue({
    id: "test_user_theme_preference",
    name: "Theme Tester",
    email: "test.theme@example.com",
  }),
}));

vi.mock("@/lib/auth/business-bootstrap", () => ({
  ensureProfileForUser: vi.fn().mockResolvedValue(undefined),
}));

describe("features/theme/actions updateThemePreferenceAction", () => {
  beforeAll(async () => {
    await testDb.delete(profiles).where(eq(profiles.userId, userId));
    await testDb.delete(user).where(eq(user.id, userId));

    const now = new Date();

    await testDb.insert(user).values({
      id: userId,
      name: "Theme Tester",
      email: "test.theme@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });
    await testDb.insert(profiles).values({
      userId,
      fullName: "Theme Tester",
      createdAt: now,
      updatedAt: now,
    });
  });

  afterAll(async () => {
    await testDb.delete(profiles).where(eq(profiles.userId, userId));
    await testDb.delete(user).where(eq(user.id, userId));
    await closeTestDb();
  });

  it("rejects an invalid preference without writing or invalidating", async () => {
    revalidateTagMock.mockClear();

    // @ts-expect-error - exercising the runtime guard with bad input
    const result = await updateThemePreferenceAction("neon");

    expect(result.ok).toBe(false);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("persists the preference and expires the cached theme tags", async () => {
    revalidateTagMock.mockClear();

    const result = await updateThemePreferenceAction("dark");
    expect(result.ok).toBe(true);

    const [row] = await testDb
      .select({ themePreference: profiles.themePreference })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    expect(row?.themePreference).toBe("dark");

    // `getThemePreferenceForUser` is a "use cache" read with a 120s stale
    // window; without this the shell keeps rendering the previous theme.
    for (const tag of getUserThemeCacheTags(userId)) {
      expect(revalidateTagMock).toHaveBeenCalledWith(tag, "max");
    }
  });
});
