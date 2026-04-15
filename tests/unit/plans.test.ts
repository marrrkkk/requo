import { describe, it, expect } from 'vitest';
import {
  workspacePlans,
  type WorkspacePlan,
  isWorkspacePlan,
  planMeta,
  getUpgradePlan,
  getUpgradeCtaLabel,
} from '@/lib/plans/plans';

describe('lib/plans/plans', () => {
  describe('workspacePlans', () => {
    it('contains all required plans', () => {
      expect(workspacePlans).toContain('free');
      expect(workspacePlans).toContain('pro');
      expect(workspacePlans).toContain('business');
      expect(workspacePlans.length).toBe(3);
    });
  });

  describe('isWorkspacePlan', () => {
    it('returns true for valid plans', () => {
      expect(isWorkspacePlan('free')).toBe(true);
      expect(isWorkspacePlan('pro')).toBe(true);
      expect(isWorkspacePlan('business')).toBe(true);
    });

    it('returns false for invalid values', () => {
      expect(isWorkspacePlan('premium')).toBe(false);
      expect(isWorkspacePlan('enterprise')).toBe(false);
      expect(isWorkspacePlan('')).toBe(false);
      expect(isWorkspacePlan(null)).toBe(false);
      expect(isWorkspacePlan(undefined)).toBe(false);
      expect(isWorkspacePlan(123)).toBe(false);
    });
  });

  describe('planMeta', () => {
    it('contains metadata for all plans', () => {
      expect(planMeta.free).toBeDefined();
      expect(planMeta.pro).toBeDefined();
      expect(planMeta.business).toBeDefined();
    });

    it('free plan has correct label and description', () => {
      expect(planMeta.free.label).toBe('Free');
      expect(planMeta.free.description).toBe('For solo owners getting organized — one workspace, one business.');
      expect(planMeta.free.ctaLabel).toBe('Get started free');
      expect(planMeta.free.highlighted).toBe(false);
    });

    it('pro plan has correct label and description', () => {
      expect(planMeta.pro.label).toBe('Pro');
      expect(planMeta.pro.description).toBe('For operators who need premium tools and multiple businesses in one workspace.');
      expect(planMeta.pro.ctaLabel).toBe('Upgrade to Pro');
      expect(planMeta.pro.highlighted).toBe(true);
    });

    it('business plan has correct label and description', () => {
      expect(planMeta.business.label).toBe('Business');
      expect(planMeta.business.description).toBe('For teams that need collaboration, roles, and the highest limits.');
      expect(planMeta.business.ctaLabel).toBe('Contact us for Business');
      expect(planMeta.business.highlighted).toBe(false);
    });
  });

  describe('getUpgradePlan', () => {
    it('free upgrades to pro', () => {
      expect(getUpgradePlan('free')).toBe('pro');
    });

    it('pro upgrades to business', () => {
      expect(getUpgradePlan('pro')).toBe('business');
    });

    it('business has no upgrade', () => {
      expect(getUpgradePlan('business')).toBeNull();
    });
  });

  describe('getUpgradeCtaLabel', () => {
    it('free has cta to upgrade to pro', () => {
      expect(getUpgradeCtaLabel('free')).toBe('Upgrade to Pro');
    });

    it('pro has cta to upgrade to business', () => {
      expect(getUpgradeCtaLabel('pro')).toBe('Contact us for Business');
    });

    it('business says highest plan', () => {
      expect(getUpgradeCtaLabel('business')).toBe("You're on the highest plan");
    });
  });
});