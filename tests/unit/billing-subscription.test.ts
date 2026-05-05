import { describe, it, expect, vi } from 'vitest';
import type { SubscriptionStatus } from '@/lib/billing/types';

// Mock "server-only" so the module can be imported in test env
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));

// Mock db module — we only test the pure resolveEffectivePlanFromSubscription function
vi.mock('@/lib/db/client', () => ({ db: {} }));
vi.mock('@/lib/db/schema/workspaces', () => ({
  workspaces: { id: 'id', plan: 'plan', updatedAt: 'updatedAt' },
}));
vi.mock('@/lib/db/schema/subscriptions', () => ({
  workspaceSubscriptions: { workspaceId: 'workspaceId', id: 'id' },
}));

import { resolveEffectivePlanFromSubscription } from '@/lib/billing/subscription-service';

/**
 * Creates a mock subscription row matching the DB shape.
 */
function mockSubscription(overrides: Partial<{
  status: SubscriptionStatus;
  plan: string;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
}> = {}) {
  return {
    id: 'sub_test123',
    workspaceId: 'ws_test123',
    status: overrides.status ?? 'active',
    plan: overrides.plan ?? 'pro',
    billingProvider: 'paymongo' as const,
    billingCurrency: 'PHP' as const,
    providerCustomerId: null,
    providerSubscriptionId: null,
    providerCheckoutId: null,
    currentPeriodStart: new Date('2026-01-01'),
    currentPeriodEnd: overrides.currentPeriodEnd ?? new Date('2026-02-01'),
    canceledAt: overrides.canceledAt ?? null,
    trialEndsAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
}

describe('lib/billing/subscription-service — resolveEffectivePlanFromSubscription', () => {
  describe('active subscription', () => {
    it('returns the plan for an active pro subscription', () => {
      const sub = mockSubscription({ status: 'active', plan: 'pro' });
      expect(resolveEffectivePlanFromSubscription(sub)).toBe('pro');
    });

    it('returns the plan for an active business subscription', () => {
      const sub = mockSubscription({ status: 'active', plan: 'business' });
      expect(resolveEffectivePlanFromSubscription(sub)).toBe('business');
    });
  });

  describe('canceled subscription', () => {
    it('returns the plan if still within billing period', () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const sub = mockSubscription({
        status: 'canceled',
        plan: 'pro',
        currentPeriodEnd: futureDate,
        canceledAt: new Date(),
      });
      expect(resolveEffectivePlanFromSubscription(sub)).toBe('pro');
    });

    it('returns free if billing period has ended', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const sub = mockSubscription({
        status: 'canceled',
        plan: 'pro',
        currentPeriodEnd: pastDate,
        canceledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      });
      expect(resolveEffectivePlanFromSubscription(sub)).toBe('free');
    });

    it('returns free if currentPeriodEnd is null', () => {
      const sub = mockSubscription({
        status: 'canceled',
        plan: 'pro',
        currentPeriodEnd: null,
      });
      expect(resolveEffectivePlanFromSubscription(sub)).toBe('free');
    });
  });

  describe('past_due subscription', () => {
    it('returns the plan (grace period keeps access)', () => {
      const sub = mockSubscription({ status: 'past_due', plan: 'pro' });
      expect(resolveEffectivePlanFromSubscription(sub)).toBe('pro');
    });

    it('returns business plan during grace period', () => {
      const sub = mockSubscription({ status: 'past_due', plan: 'business' });
      expect(resolveEffectivePlanFromSubscription(sub)).toBe('business');
    });
  });

  describe('pending subscription', () => {
    it('returns free', () => {
      const sub = mockSubscription({ status: 'pending', plan: 'pro' });
      expect(resolveEffectivePlanFromSubscription(sub)).toBe('free');
    });
  });

  describe('expired subscription', () => {
    it('returns free', () => {
      const sub = mockSubscription({ status: 'expired', plan: 'pro' });
      expect(resolveEffectivePlanFromSubscription(sub)).toBe('free');
    });
  });

  describe('incomplete subscription', () => {
    it('returns free', () => {
      const sub = mockSubscription({ status: 'incomplete', plan: 'pro' });
      expect(resolveEffectivePlanFromSubscription(sub)).toBe('free');
    });
  });

  describe('free status subscription', () => {
    it('returns free', () => {
      const sub = mockSubscription({ status: 'free', plan: 'free' });
      expect(resolveEffectivePlanFromSubscription(sub)).toBe('free');
    });
  });

  describe('unknown status', () => {
    it('returns free for any unrecognized status', () => {
      // @ts-expect-error — deliberately testing an invalid status value
      const sub = mockSubscription({ status: 'unknown_status', plan: 'pro' });
      expect(resolveEffectivePlanFromSubscription(sub)).toBe('free');
    });
  });
});
