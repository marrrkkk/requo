import { describe, it, expect } from 'vitest';
import {
  usageLimitKeys,
  type UsageLimitKey,
  getUsageLimit,
  isUsageLimited,
  usageLimitLabels,
} from '@/lib/plans/usage-limits';

describe('lib/plans/usage-limits', () => {
  describe('usageLimitKeys', () => {
    it('contains all required limit keys', () => {
      expect(usageLimitKeys).toContain('inquiriesPerMonth');
      expect(usageLimitKeys).toContain('quotesPerMonth');
      expect(usageLimitKeys).toContain('businessesPerWorkspace');
      expect(usageLimitKeys).toContain('membersPerWorkspace');
      expect(usageLimitKeys).toContain('liveFormsPerWorkspace');
    });

    it('has expected count of limit keys', () => {
      expect(usageLimitKeys.length).toBe(6);
    });
  });

  describe('getUsageLimit', () => {
    describe('free plan', () => {
      it('has limited inquiries per month', () => {
        expect(getUsageLimit('free', 'inquiriesPerMonth')).toBe(100);
      });

      it('has limited quotes per month', () => {
        expect(getUsageLimit('free', 'quotesPerMonth')).toBe(50);
      });

      it('has limited businesses per workspace', () => {
        expect(getUsageLimit('free', 'businessesPerWorkspace')).toBe(1);
      });

      it('has limited members per workspace', () => {
        expect(getUsageLimit('free', 'membersPerWorkspace')).toBe(1);
      });

      it('has limited live forms', () => {
        expect(getUsageLimit('free', 'liveFormsPerWorkspace')).toBe(1);
      });
    });

    describe('pro plan', () => {
      it('has unlimited inquiries per month', () => {
        expect(getUsageLimit('pro', 'inquiriesPerMonth')).toBeNull();
      });

      it('has unlimited quotes per month', () => {
        expect(getUsageLimit('pro', 'quotesPerMonth')).toBeNull();
      });

      it('has limited but higher businesses limit', () => {
        expect(getUsageLimit('pro', 'businessesPerWorkspace')).toBe(10);
      });

      it('has limited members at 1', () => {
        expect(getUsageLimit('pro', 'membersPerWorkspace')).toBe(1);
      });

      it('has unlimited live forms', () => {
        expect(getUsageLimit('pro', 'liveFormsPerWorkspace')).toBeNull();
      });
    });

    describe('business plan', () => {
      it('has unlimited inquiries', () => {
        expect(getUsageLimit('business', 'inquiriesPerMonth')).toBeNull();
      });

      it('has unlimited quotes', () => {
        expect(getUsageLimit('business', 'quotesPerMonth')).toBeNull();
      });

      it('has unlimited businesses', () => {
        expect(getUsageLimit('business', 'businessesPerWorkspace')).toBeNull();
      });

      it('has higher members limit', () => {
        expect(getUsageLimit('business', 'membersPerWorkspace')).toBe(25);
      });

      it('has unlimited live forms', () => {
        expect(getUsageLimit('business', 'liveFormsPerWorkspace')).toBeNull();
      });
    });
  });

  describe('isUsageLimited', () => {
    it('free plan is limited on all keys', () => {
      expect(isUsageLimited('free', 'inquiriesPerMonth')).toBe(true);
      expect(isUsageLimited('free', 'quotesPerMonth')).toBe(true);
      expect(isUsageLimited('free', 'businessesPerWorkspace')).toBe(true);
      expect(isUsageLimited('free', 'membersPerWorkspace')).toBe(true);
      expect(isUsageLimited('free', 'liveFormsPerWorkspace')).toBe(true);
    });

    it('pro plan is limited on some keys', () => {
      expect(isUsageLimited('pro', 'inquiriesPerMonth')).toBe(false);
      expect(isUsageLimited('pro', 'quotesPerMonth')).toBe(false);
      expect(isUsageLimited('pro', 'businessesPerWorkspace')).toBe(true);
      expect(isUsageLimited('pro', 'membersPerWorkspace')).toBe(true);
      expect(isUsageLimited('pro', 'liveFormsPerWorkspace')).toBe(false);
    });

    it('business plan is limited only on members', () => {
      expect(isUsageLimited('business', 'inquiriesPerMonth')).toBe(false);
      expect(isUsageLimited('business', 'quotesPerMonth')).toBe(false);
      expect(isUsageLimited('business', 'businessesPerWorkspace')).toBe(false);
      expect(isUsageLimited('business', 'membersPerWorkspace')).toBe(true);
      expect(isUsageLimited('business', 'liveFormsPerWorkspace')).toBe(false);
    });
  });

  describe('usageLimitLabels', () => {
    it('has labels for all limit keys', () => {
      usageLimitKeys.forEach((key) => {
        expect(usageLimitLabels[key]).toBeDefined();
        expect(typeof usageLimitLabels[key]).toBe('string');
        expect(usageLimitLabels[key].length).toBeGreaterThan(0);
      });
    });

    it('inquiriesPerMonth has correct label', () => {
      expect(usageLimitLabels.inquiriesPerMonth).toBe('Inquiries per month');
    });

    it('quotesPerMonth has correct label', () => {
      expect(usageLimitLabels.quotesPerMonth).toBe('Quotes per month');
    });

    it('businessesPerWorkspace has correct label', () => {
      expect(usageLimitLabels.businessesPerWorkspace).toBe('Businesses per workspace');
    });

    it('membersPerWorkspace has correct label', () => {
      expect(usageLimitLabels.membersPerWorkspace).toBe('Members per workspace');
    });

    it('liveFormsPerWorkspace has correct label', () => {
      expect(usageLimitLabels.liveFormsPerWorkspace).toBe('Live inquiry forms');
    });
  });
});