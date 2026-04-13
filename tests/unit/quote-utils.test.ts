import { describe, it, expect } from 'vitest';
import {
  parseCurrencyInputToCents,
  calculateQuoteEditorTotals,
  isQuotePastValidityDate,
  getQuoteReminderKinds,
  centsToMoneyInput,
  isQuoteEditorLineItemBlank
} from '@/features/quotes/utils';
import { QuoteEditorLineItemValue } from '@/features/quotes/types';

describe('features/quotes/utils', () => {
  describe('parseCurrencyInputToCents', () => {
    it('parses basic money values', () => {
      expect(parseCurrencyInputToCents('10')).toBe(1000);
      expect(parseCurrencyInputToCents('10.50')).toBe(1050);
      expect(parseCurrencyInputToCents('10.99')).toBe(1099);
    });

    it('handles commas gracefully', () => {
      expect(parseCurrencyInputToCents('1,000.50')).toBe(100050);
      expect(parseCurrencyInputToCents('1,000,000')).toBe(100000000);
    });

    it('returns 0 for invalid or empty values', () => {
      expect(parseCurrencyInputToCents('')).toBe(0);
      expect(parseCurrencyInputToCents('abc')).toBe(0);
      expect(parseCurrencyInputToCents('10.555')).toBe(0); // More than 2 decimal places is invalid by this regex
    });
  });

  describe('centsToMoneyInput', () => {
    it('converts cents to 2-decimal string', () => {
      expect(centsToMoneyInput(1000)).toBe('10.00');
      expect(centsToMoneyInput(1050)).toBe('10.50');
      expect(centsToMoneyInput(99)).toBe('0.99');
    });

    it('handles 0 or falsy values', () => {
      expect(centsToMoneyInput(0)).toBe('');
    });
  });

  describe('calculateQuoteEditorTotals', () => {
    it('calculates totals correctly with no discount', () => {
      const items: QuoteEditorLineItemValue[] = [
        { id: '1', description: 'Item 1', quantity: '2', unitPrice: '10.00' },
        { id: '2', description: 'Item 2', quantity: '1', unitPrice: '5.50' }
      ];

      const result = calculateQuoteEditorTotals(items, '');
      expect(result).toEqual({
        subtotalInCents: 2550, // 2*1000 + 1*550
        discountInCents: 0,
        totalInCents: 2550
      });
    });

    it('calculates totals correctly with discount', () => {
      const items: QuoteEditorLineItemValue[] = [
        { id: '1', description: 'Item 1', quantity: '1', unitPrice: '100.00' }
      ];

      const result = calculateQuoteEditorTotals(items, '10.00');
      expect(result).toEqual({
        subtotalInCents: 10000,
        discountInCents: 1000,
        totalInCents: 9000
      });
    });

    it('caps discount at subtotal', () => {
      const items: QuoteEditorLineItemValue[] = [
        { id: '1', description: 'Item 1', quantity: '1', unitPrice: '50.00' }
      ];

      // Try to give a $100 discount on a $50 item
      const result = calculateQuoteEditorTotals(items, '100.00');
      expect(result).toEqual({
        subtotalInCents: 5000,
        discountInCents: 5000,
        totalInCents: 0
      });
    });
  });

  describe('isQuoteEditorLineItemBlank', () => {
    it('returns true for a blank item', () => {
      expect(isQuoteEditorLineItemBlank({
        id: '1',
        description: '',
        quantity: '1',
        unitPrice: ''
      })).toBe(true);

      expect(isQuoteEditorLineItemBlank({
        id: '2',
        description: '   ',
        quantity: '',
        unitPrice: '  '
      })).toBe(true);
    });

    it('returns false if fields are populated', () => {
      expect(isQuoteEditorLineItemBlank({
        id: '1',
        description: 'Design',
        quantity: '1',
        unitPrice: ''
      })).toBe(false);

      expect(isQuoteEditorLineItemBlank({
        id: '2',
        description: '',
        quantity: '1',
        unitPrice: '10'
      })).toBe(false);

      expect(isQuoteEditorLineItemBlank({
        id: '3',
        description: '',
        quantity: '2',
        unitPrice: ''
      })).toBe(false);
    });
  });

  describe('isQuotePastValidityDate', () => {
    it('returns true if the date is in the past compared to today', () => {
      // Mocking today is hard without a specific library, but the function uses new Date()
      // Let's assume today is some date.
      const today = new Date().toISOString().slice(0, 10);

      // Make a date strictly less than today string-wise
      const pastDate = '2000-01-01';
      expect(isQuotePastValidityDate(pastDate)).toBe(true);

      // Make a date strictly greater than today string-wise
      const futureDate = '3000-01-01';
      expect(isQuotePastValidityDate(futureDate)).toBe(false);

      // Today
      expect(isQuotePastValidityDate(today)).toBe(false);
    });
  });

  describe('getQuoteReminderKinds', () => {
    it('returns empty array if not sent or if customer has responded', () => {
      const now = new Date('2024-01-10T12:00:00Z');
      expect(getQuoteReminderKinds({
        status: 'draft',
        sentAt: null,
        customerRespondedAt: null,
        validUntil: '2024-01-20',
        now
      })).toEqual([]);

      expect(getQuoteReminderKinds({
        status: 'sent',
        sentAt: new Date('2024-01-01T12:00:00Z'),
        customerRespondedAt: new Date('2024-01-05T12:00:00Z'),
        validUntil: '2024-01-20',
        now
      })).toEqual([]);
    });

    it('returns follow_up_due if sent > 3 days ago', () => {
      const now = new Date('2024-01-10T12:00:00Z');
      const sentAt = new Date('2024-01-05T12:00:00Z'); // 5 days ago
      const kinds = getQuoteReminderKinds({
        status: 'sent',
        sentAt,
        customerRespondedAt: null,
        validUntil: '2024-02-01',
        now
      });
      expect(kinds).toContain('follow_up_due');
    });

    it('returns expiring_soon if validUntil is within next 7 days', () => {
      const now = new Date('2024-01-10T12:00:00Z');
      const sentAt = new Date('2024-01-09T12:00:00Z'); // sent yesterday, no follow-up needed yet

      // Expires in 5 days
      const kinds = getQuoteReminderKinds({
        status: 'sent',
        sentAt,
        customerRespondedAt: null,
        validUntil: '2024-01-15',
        now
      });
      expect(kinds).toContain('expiring_soon');
      expect(kinds).not.toContain('follow_up_due');
    });
  });
});
