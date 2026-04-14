import { describe, it, expect } from 'vitest';
import { createBusinessSchema } from '@/features/businesses/schemas';

describe('features/businesses/schemas', () => {
  describe('createBusinessSchema', () => {
    it('validates a correct business payload', () => {
      const payload = {
        name: 'My Cool Business',
        businessType: 'print_signage',
        countryCode: 'US',
        workspaceId: 'workspace_1'
      };

      const result = createBusinessSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('rejects short names', () => {
      const payload = {
        name: 'a',
        businessType: 'print_signage',
        countryCode: 'US',
        workspaceId: 'workspace_1'
      };

      const result = createBusinessSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Enter a business name.');
      }
    });

    it('rejects invalid country codes', () => {
      const payload = {
        name: 'My Cool Business',
        businessType: 'print_signage',
        countryCode: 'XX',
        workspaceId: 'workspace_1'
      };

      const result = createBusinessSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Choose a valid country.');
      }
    });
  });
});
