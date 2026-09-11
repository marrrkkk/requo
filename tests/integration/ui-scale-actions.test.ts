import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest';
import { testDb, closeTestDb } from '@/tests/support/db';
import { profiles, user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

import { updateUiScalePreferenceAction } from '@/features/theme/ui-scale-actions';
import { getUiScalePreferenceForUser } from '@/features/theme/ui-scale-queries';

// Mock dependencies
vi.mock('@/lib/db/client', () => ({ db: testDb }));
vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  requireSession: vi.fn().mockResolvedValue({
    user: { id: 'test_user_scale' },
  }),
  requireUser: vi.fn().mockResolvedValue({
    id: 'test_user_scale',
    name: 'Scale Tester',
    email: 'test.scale@example.com',
  }),
}));

vi.mock('@/lib/auth/business-bootstrap', () => ({
  ensureProfileForUser: vi.fn().mockImplementation(async ({ id }: { id: string }) => {
    await testDb
      .insert(profiles)
      .values({ userId: id, fullName: 'Scale Tester' })
      .onConflictDoNothing();
  }),
}));

describe('features/theme/ui-scale-actions', () => {
  beforeAll(async () => {
    await testDb.delete(profiles).where(eq(profiles.userId, 'test_user_scale'));
    await testDb.delete(user).where(eq(user.id, 'test_user_scale'));
    await testDb.insert(user).values({
      id: 'test_user_scale',
      name: 'Scale Tester',
      email: 'test.scale@example.com',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterAll(async () => {
    await testDb.delete(profiles).where(eq(profiles.userId, 'test_user_scale'));
    await testDb.delete(user).where(eq(user.id, 'test_user_scale'));
    await closeTestDb();
  });

  it('rejects an invalid scale without touching the database', async () => {
    // @ts-expect-error - exercising the runtime guard with bad input
    const result = await updateUiScalePreferenceAction('huge');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('valid interface scale');
    }
  });

  it('persists a valid scale and reads it back', async () => {
    const update = await updateUiScalePreferenceAction('large');
    expect(update.ok).toBe(true);

    const [row] = await testDb
      .select({ uiScale: profiles.uiScale })
      .from(profiles)
      .where(eq(profiles.userId, 'test_user_scale'))
      .limit(1);
    expect(row?.uiScale).toBe('large');

    await expect(getUiScalePreferenceForUser('test_user_scale')).resolves.toBe(
      'large',
    );
  });

  it('falls back to default when the user has no profile row', async () => {
    await expect(
      getUiScalePreferenceForUser('test_user_scale_missing'),
    ).resolves.toBe('default');
  });
});
