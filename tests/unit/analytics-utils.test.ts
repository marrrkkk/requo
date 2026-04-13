import { describe, it, expect } from 'vitest';
import {
  formatAnalyticsPercent,
  getTrendBarHeight,
  formatAnalyticsDuration,
  formatAnalyticsMoney,
} from '@/features/analytics/utils';

describe('features/analytics/utils', () => {
  describe('formatAnalyticsPercent', () => {
    it('formats a decimal as a percentage string', () => {
      expect(formatAnalyticsPercent(0.45)).toBe('45%');
      expect(formatAnalyticsPercent(1)).toBe('100%');
      expect(formatAnalyticsPercent(0)).toBe('0%');
    });
  });

  describe('getTrendBarHeight', () => {
    it('returns at least 12% if ratio is small', () => {
      expect(getTrendBarHeight(1, 100)).toBe('12%');
    });

    it('returns 12% if max value is 0', () => {
      expect(getTrendBarHeight(5, 0)).toBe('12%');
    });

    it('returns proportional height', () => {
      expect(getTrendBarHeight(50, 100)).toBe('50%');
      expect(getTrendBarHeight(100, 100)).toBe('100%');
    });
  });

  describe('formatAnalyticsDuration', () => {
    it('returns null for null', () => {
      expect(formatAnalyticsDuration(null)).toBeNull();
    });

    it('formats minutes if less than 1 hour', () => {
      expect(formatAnalyticsDuration(0.5)).toBe('30 min');
      expect(formatAnalyticsDuration(0.01)).toBe('< 1 min'); // ~0.6 min
    });

    it('formats hours if less than 24 hours', () => {
      expect(formatAnalyticsDuration(1)).toBe('1h');
      expect(formatAnalyticsDuration(23.5)).toBe('23.5h');
    });

    it('formats days if >= 24 hours', () => {
      expect(formatAnalyticsDuration(24)).toBe('1d');
      expect(formatAnalyticsDuration(36)).toBe('1.5d');
    });
  });

  describe('formatAnalyticsMoney', () => {
    it('formats cents correctly without fractional digits', () => {
      expect(formatAnalyticsMoney(1000)).toBe('$10');
      expect(formatAnalyticsMoney(1050)).toBe('$11'); // Rounds up because fraction digits = 0
    });
  });
});
