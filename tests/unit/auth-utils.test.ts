import { describe, it, expect } from 'vitest';
import { getAuthErrorMessage } from '@/features/auth/utils';

describe('features/auth/utils', () => {
  describe('getAuthErrorMessage', () => {
    it('returns message if present', () => {
      expect(getAuthErrorMessage({ message: 'Invalid email' }, 'Fallback')).toBe('Invalid email');
    });

    it('returns statusText if message is missing', () => {
      expect(getAuthErrorMessage({ statusText: 'Not Found' }, 'Fallback')).toBe('Not Found');
    });

    it('returns fallback if neither is present', () => {
      expect(getAuthErrorMessage({}, 'Fallback')).toBe('Fallback');
    });

    it('returns fallback if error is null or undefined', () => {
      expect(getAuthErrorMessage(null, 'Fallback')).toBe('Fallback');
      expect(getAuthErrorMessage(undefined, 'Fallback')).toBe('Fallback');
    });
  });
});
