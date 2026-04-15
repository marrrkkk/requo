import { describe, it, expect } from 'vitest';
import {
  getBillingRegion,
  getBillingRegionFromCountry,
  getDefaultCurrency,
  getDefaultProvider,
  getProviderForCurrency,
} from '@/lib/billing/region';

describe('lib/billing/region', () => {
  describe('getBillingRegion', () => {
    it('returns PH for Philippines via Vercel header', () => {
      const headers = new Headers({ 'x-vercel-ip-country': 'PH' });
      expect(getBillingRegion(headers)).toBe('PH');
    });

    it('returns PH case-insensitively from Vercel header', () => {
      const headers = new Headers({ 'x-vercel-ip-country': 'ph' });
      expect(getBillingRegion(headers)).toBe('PH');
    });

    it('returns INTL for non-PH via Vercel header', () => {
      const headers = new Headers({ 'x-vercel-ip-country': 'US' });
      expect(getBillingRegion(headers)).toBe('INTL');
    });

    it('returns PH via Cloudflare header when Vercel header missing', () => {
      const headers = new Headers({ 'cf-ipcountry': 'PH' });
      expect(getBillingRegion(headers)).toBe('PH');
    });

    it('returns PH case-insensitively from Cloudflare header', () => {
      const headers = new Headers({ 'cf-ipcountry': 'ph' });
      expect(getBillingRegion(headers)).toBe('PH');
    });

    it('returns INTL for non-PH via Cloudflare header', () => {
      const headers = new Headers({ 'cf-ipcountry': 'SG' });
      expect(getBillingRegion(headers)).toBe('INTL');
    });

    it('prefers Vercel header over Cloudflare', () => {
      const headers = new Headers({
        'x-vercel-ip-country': 'US',
        'cf-ipcountry': 'PH',
      });
      expect(getBillingRegion(headers)).toBe('INTL');
    });

    it('returns INTL when no geo headers present', () => {
      const headers = new Headers();
      expect(getBillingRegion(headers)).toBe('INTL');
    });

    it('returns INTL for other known country codes', () => {
      const countries = ['US', 'JP', 'GB', 'DE', 'AU', 'IN', 'CA'];
      countries.forEach((country) => {
        const headers = new Headers({ 'x-vercel-ip-country': country });
        expect(getBillingRegion(headers)).toBe('INTL');
      });
    });
  });

  describe('getBillingRegionFromCountry', () => {
    it('returns PH for "PH"', () => {
      expect(getBillingRegionFromCountry('PH')).toBe('PH');
    });

    it('returns PH case-insensitively', () => {
      expect(getBillingRegionFromCountry('ph')).toBe('PH');
      expect(getBillingRegionFromCountry('Ph')).toBe('PH');
    });

    it('returns INTL for other countries', () => {
      expect(getBillingRegionFromCountry('US')).toBe('INTL');
      expect(getBillingRegionFromCountry('SG')).toBe('INTL');
    });

    it('returns INTL for null', () => {
      expect(getBillingRegionFromCountry(null)).toBe('INTL');
    });

    it('returns INTL for undefined', () => {
      expect(getBillingRegionFromCountry(undefined)).toBe('INTL');
    });

    it('returns INTL for empty string', () => {
      expect(getBillingRegionFromCountry('')).toBe('INTL');
    });
  });

  describe('getDefaultCurrency', () => {
    it('returns PHP for PH region', () => {
      expect(getDefaultCurrency('PH')).toBe('PHP');
    });

    it('returns USD for INTL region', () => {
      expect(getDefaultCurrency('INTL')).toBe('USD');
    });
  });

  describe('getDefaultProvider', () => {
    it('returns paymongo for PH region', () => {
      expect(getDefaultProvider('PH')).toBe('paymongo');
    });

    it('returns lemonsqueezy for INTL region', () => {
      expect(getDefaultProvider('INTL')).toBe('lemonsqueezy');
    });
  });

  describe('getProviderForCurrency', () => {
    it('returns paymongo for PHP', () => {
      expect(getProviderForCurrency('PHP')).toBe('paymongo');
    });

    it('returns lemonsqueezy for USD', () => {
      expect(getProviderForCurrency('USD')).toBe('lemonsqueezy');
    });
  });
});
