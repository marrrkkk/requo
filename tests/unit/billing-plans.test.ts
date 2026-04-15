import { describe, it, expect } from 'vitest';
import {
  planPricing,
  getPlanPrice,
  formatPrice,
  getPlanPriceLabel,
  getCurrencySymbol,
} from '@/lib/billing/plans';

describe('lib/billing/plans', () => {
  describe('planPricing', () => {
    it('defines prices for pro plan', () => {
      expect(planPricing.pro).toBeDefined();
      expect(planPricing.pro.PHP).toBe(29900);
      expect(planPricing.pro.USD).toBe(499);
    });

    it('defines prices for business plan', () => {
      expect(planPricing.business).toBeDefined();
      expect(planPricing.business.PHP).toBe(59900);
      expect(planPricing.business.USD).toBe(999);
    });

    it('business plan is more expensive than pro', () => {
      expect(planPricing.business.PHP).toBeGreaterThan(planPricing.pro.PHP);
      expect(planPricing.business.USD).toBeGreaterThan(planPricing.pro.USD);
    });
  });

  describe('getPlanPrice', () => {
    it('returns pro PHP price in centavos', () => {
      expect(getPlanPrice('pro', 'PHP')).toBe(29900);
    });

    it('returns pro USD price in cents', () => {
      expect(getPlanPrice('pro', 'USD')).toBe(499);
    });

    it('returns business PHP price in centavos', () => {
      expect(getPlanPrice('business', 'PHP')).toBe(59900);
    });

    it('returns business USD price in cents', () => {
      expect(getPlanPrice('business', 'USD')).toBe(999);
    });
  });

  describe('formatPrice', () => {
    it('formats PHP prices with peso sign and no decimals', () => {
      expect(formatPrice(29900, 'PHP')).toBe('₱299');
    });

    it('formats USD prices with dollar sign and two decimals', () => {
      expect(formatPrice(499, 'USD')).toBe('$4.99');
    });

    it('formats PHP zero', () => {
      expect(formatPrice(0, 'PHP')).toBe('₱0');
    });

    it('formats USD zero', () => {
      expect(formatPrice(0, 'USD')).toBe('$0.00');
    });

    it('formats large PHP amounts', () => {
      expect(formatPrice(59900, 'PHP')).toBe('₱599');
    });

    it('formats large USD amounts', () => {
      expect(formatPrice(999, 'USD')).toBe('$9.99');
    });

    it('formats USD amounts with round dollars', () => {
      expect(formatPrice(1000, 'USD')).toBe('$10.00');
    });
  });

  describe('getPlanPriceLabel', () => {
    it('returns pro PHP label with /mo suffix', () => {
      expect(getPlanPriceLabel('pro', 'PHP')).toBe('₱299/mo');
    });

    it('returns pro USD label with /mo suffix', () => {
      expect(getPlanPriceLabel('pro', 'USD')).toBe('$4.99/mo');
    });

    it('returns business PHP label', () => {
      expect(getPlanPriceLabel('business', 'PHP')).toBe('₱599/mo');
    });

    it('returns business USD label', () => {
      expect(getPlanPriceLabel('business', 'USD')).toBe('$9.99/mo');
    });
  });

  describe('getCurrencySymbol', () => {
    it('returns peso sign for PHP', () => {
      expect(getCurrencySymbol('PHP')).toBe('₱');
    });

    it('returns dollar sign for USD', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
    });
  });
});
