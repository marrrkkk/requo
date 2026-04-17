import { describe, it, expect } from 'vitest';
import {
  planPricing,
  getPlanPrice,
  formatPrice,
  getPlanPriceLabel,
  getCurrencySymbol,
  getMonthlyEquivalentLabel,
  getYearlySavingsPercent,
} from '@/lib/billing/plans';

describe('lib/billing/plans', () => {
  describe('planPricing', () => {
    it('defines monthly prices for pro plan', () => {
      expect(planPricing.monthly.pro).toBeDefined();
      expect(planPricing.monthly.pro.PHP).toBe(29900);
      expect(planPricing.monthly.pro.USD).toBe(499);
    });

    it('defines monthly prices for business plan', () => {
      expect(planPricing.monthly.business).toBeDefined();
      expect(planPricing.monthly.business.PHP).toBe(59900);
      expect(planPricing.monthly.business.USD).toBe(999);
    });

    it('defines yearly prices for pro plan', () => {
      expect(planPricing.yearly.pro).toBeDefined();
      expect(planPricing.yearly.pro.PHP).toBe(299000);
      expect(planPricing.yearly.pro.USD).toBe(4990);
    });

    it('defines yearly prices for business plan', () => {
      expect(planPricing.yearly.business).toBeDefined();
      expect(planPricing.yearly.business.PHP).toBe(599000);
      expect(planPricing.yearly.business.USD).toBe(9990);
    });

    it('business plan is more expensive than pro', () => {
      expect(planPricing.monthly.business.PHP).toBeGreaterThan(planPricing.monthly.pro.PHP);
      expect(planPricing.monthly.business.USD).toBeGreaterThan(planPricing.monthly.pro.USD);
    });

    it('yearly prices are less than 12x monthly', () => {
      expect(planPricing.yearly.pro.USD).toBeLessThan(planPricing.monthly.pro.USD * 12);
      expect(planPricing.yearly.business.USD).toBeLessThan(planPricing.monthly.business.USD * 12);
    });
  });

  describe('getPlanPrice', () => {
    it('returns pro PHP monthly price in centavos', () => {
      expect(getPlanPrice('pro', 'PHP')).toBe(29900);
    });

    it('returns pro USD monthly price in cents', () => {
      expect(getPlanPrice('pro', 'USD')).toBe(499);
    });

    it('returns business PHP monthly price in centavos', () => {
      expect(getPlanPrice('business', 'PHP')).toBe(59900);
    });

    it('returns business USD monthly price in cents', () => {
      expect(getPlanPrice('business', 'USD')).toBe(999);
    });

    it('returns yearly prices when interval is yearly', () => {
      expect(getPlanPrice('pro', 'USD', 'yearly')).toBe(4990);
      expect(getPlanPrice('business', 'PHP', 'yearly')).toBe(599000);
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
    it('returns pro PHP monthly label with /mo suffix', () => {
      expect(getPlanPriceLabel('pro', 'PHP')).toBe('₱299/mo');
    });

    it('returns pro USD monthly label with /mo suffix', () => {
      expect(getPlanPriceLabel('pro', 'USD')).toBe('$4.99/mo');
    });

    it('returns business PHP monthly label', () => {
      expect(getPlanPriceLabel('business', 'PHP')).toBe('₱599/mo');
    });

    it('returns business USD monthly label', () => {
      expect(getPlanPriceLabel('business', 'USD')).toBe('$9.99/mo');
    });

    it('returns yearly labels with /yr suffix', () => {
      expect(getPlanPriceLabel('pro', 'USD', 'yearly')).toBe('$49.90/yr');
      expect(getPlanPriceLabel('business', 'USD', 'yearly')).toBe('$99.90/yr');
    });
  });

  describe('getMonthlyEquivalentLabel', () => {
    it('returns monthly equivalent for yearly pro USD', () => {
      expect(getMonthlyEquivalentLabel('pro', 'USD')).toBe('$4.16/mo');
    });

    it('returns monthly equivalent for yearly pro PHP', () => {
      expect(getMonthlyEquivalentLabel('pro', 'PHP')).toBe('₱249/mo');
    });
  });

  describe('getYearlySavingsPercent', () => {
    it('returns savings percentage for pro USD', () => {
      const savings = getYearlySavingsPercent('pro', 'USD');
      expect(savings).toBeGreaterThan(0);
      expect(savings).toBeLessThanOrEqual(20);
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

