import { describe, it, expect } from 'vitest';
import { createBusinessSchema } from '@/features/businesses/schemas';

describe('features/businesses/schemas', () => {
  describe('createBusinessSchema', () => {
    it('validates a correct business payload', () => {
      const payload = {
        name: 'My Cool Business',
        slug: 'my-cool-business',
        countryCode: 'US',
        businessType: 'print_signage',
        defaultCurrency: 'usd',
        businessId: 'business_1'
      };

      const result = createBusinessSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('rejects short names', () => {
      const payload = {
        name: 'a',
        countryCode: 'US',
        businessType: 'print_signage',
        defaultCurrency: 'USD',
        businessId: 'business_1'
      };

      const result = createBusinessSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Enter a business name.');
      }
    });

    it('rejects unsupported currencies', () => {
      const payload = {
        name: 'My Cool Business',
        countryCode: 'US',
        businessType: 'print_signage',
        defaultCurrency: 'XYZ',
        businessId: 'business_1'
      };

      const result = createBusinessSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.map((issue) => issue.message).join(' ')).toContain('Choose a supported currency.');
      }
    });

    it('normalizes the currency code before validation', () => {
      const payload = {
        name: 'My Cool Business',
        countryCode: 'us',
        businessType: 'print_signage',
        defaultCurrency: 'php',
        businessId: 'business_1'
      };

      const result = createBusinessSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.defaultCurrency).toBe('PHP');
        expect(result.data.countryCode).toBe('US');
      }
    });

    it('rejects missing country and invalid slugs', () => {
      const missingCountry = createBusinessSchema.safeParse({
        name: 'My Cool Business',
        businessType: 'print_signage',
        defaultCurrency: 'USD',
        businessId: 'business_1',
      });
      expect(missingCountry.success).toBe(false);

      const badSlug = createBusinessSchema.safeParse({
        name: 'My Cool Business',
        slug: 'Bad Slug!!',
        countryCode: 'US',
        businessType: 'print_signage',
        defaultCurrency: 'USD',
        businessId: 'business_1',
      });
      expect(badSlug.success).toBe(false);
    });
  });
});
