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

    it('maps verification and abuse-control errors to safer copy', () => {
      expect(
        getAuthErrorMessage(
          { message: 'Email not verified. Please verify your email address.' },
          'Fallback',
        ),
      ).toBe('Verify your email before signing in.');

      expect(
        getAuthErrorMessage(
          { message: 'Too many requests. Please try again later.' },
          'Fallback',
        ),
      ).toBe('Too many attempts. Wait a few minutes and try again.');

      expect(
        getAuthErrorMessage(
          { message: 'Captcha validation failed.' },
          'Fallback',
        ),
      ).toBe('Complete the security check and try again.');
    });
  });
});
