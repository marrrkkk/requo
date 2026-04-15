import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';

// Mock "server-only" so the modules can be imported in test env
vi.mock('server-only', () => ({}));

// Mock env to provide webhook secrets
vi.mock('@/lib/env', () => ({
  env: {
    PAYMONGO_SECRET_KEY: 'sk_test_123',
    PAYMONGO_PUBLIC_KEY: 'pk_test_123',
    PAYMONGO_WEBHOOK_SECRET: 'whsk_test_secret',
    BETTER_AUTH_URL: 'http://localhost:3000',
    LEMONSQUEEZY_API_KEY: 'test_key',
    LEMONSQUEEZY_STORE_ID: '12345',
    LEMONSQUEEZY_WEBHOOK_SECRET: 'ls_test_secret',
    LEMONSQUEEZY_PRO_VARIANT_ID: '111',
    LEMONSQUEEZY_BUSINESS_VARIANT_ID: '222',
  },
  isPayMongoConfigured: true,
  isLemonSqueezyConfigured: true,
}));

import { mapPayMongoStatus, verifyPayMongoWebhookSignature } from '@/lib/billing/providers/paymongo';
import { mapLemonSqueezyStatus, verifyLemonSqueezyWebhookSignature } from '@/lib/billing/providers/lemonsqueezy';

describe('PayMongo provider', () => {
  describe('mapPayMongoStatus', () => {
    it('maps "succeeded" to "active"', () => {
      expect(mapPayMongoStatus('succeeded')).toBe('active');
    });

    it('maps "awaiting_payment_method" to "pending"', () => {
      expect(mapPayMongoStatus('awaiting_payment_method')).toBe('pending');
    });

    it('maps "awaiting_next_action" to "pending"', () => {
      expect(mapPayMongoStatus('awaiting_next_action')).toBe('pending');
    });

    it('maps "processing" to "pending"', () => {
      expect(mapPayMongoStatus('processing')).toBe('pending');
    });

    it('maps "expired" to "expired"', () => {
      expect(mapPayMongoStatus('expired')).toBe('expired');
    });

    it('maps "failed" to "failed"', () => {
      expect(mapPayMongoStatus('failed')).toBe('failed');
    });

    it('maps unknown statuses to "failed"', () => {
      expect(mapPayMongoStatus('something_else')).toBe('failed');
      expect(mapPayMongoStatus('')).toBe('failed');
    });
  });

  describe('verifyPayMongoWebhookSignature', () => {
    it('returns true for valid signature', () => {
      const body = '{"test":"data"}';
      const timestamp = '1234567890';
      const signedPayload = `${timestamp}.${body}`;
      const sig = crypto
        .createHmac('sha256', 'whsk_test_secret')
        .update(signedPayload)
        .digest('hex');

      const header = `t=${timestamp},li=${sig}`;
      expect(verifyPayMongoWebhookSignature(body, header)).toBe(true);
    });

    it('returns true for test signature (te=)', () => {
      const body = '{"test":"payload"}';
      const timestamp = '9999999999';
      const signedPayload = `${timestamp}.${body}`;
      const sig = crypto
        .createHmac('sha256', 'whsk_test_secret')
        .update(signedPayload)
        .digest('hex');

      const header = `t=${timestamp},te=${sig}`;
      expect(verifyPayMongoWebhookSignature(body, header)).toBe(true);
    });

    it('returns false for invalid signature', () => {
      const body = '{"test":"data"}';
      const header = 't=1234567890,li=invalid_signature_hex';
      expect(verifyPayMongoWebhookSignature(body, header)).toBe(false);
    });

    it('returns false when timestamp is missing', () => {
      const body = '{"test":"data"}';
      const header = 'li=somesig';
      expect(verifyPayMongoWebhookSignature(body, header)).toBe(false);
    });

    it('returns false when signature part is missing', () => {
      const body = '{"test":"data"}';
      const header = 't=1234567890';
      expect(verifyPayMongoWebhookSignature(body, header)).toBe(false);
    });

    it('returns false for empty header', () => {
      expect(verifyPayMongoWebhookSignature('body', '')).toBe(false);
    });
  });
});

describe('Lemon Squeezy provider', () => {
  describe('mapLemonSqueezyStatus', () => {
    it('maps "active" to "active"', () => {
      expect(mapLemonSqueezyStatus('active')).toBe('active');
    });

    it('maps "past_due" to "past_due"', () => {
      expect(mapLemonSqueezyStatus('past_due')).toBe('past_due');
    });

    it('maps "cancelled" to "canceled" (spelling normalization)', () => {
      expect(mapLemonSqueezyStatus('cancelled')).toBe('canceled');
    });

    it('maps "expired" to "expired"', () => {
      expect(mapLemonSqueezyStatus('expired')).toBe('expired');
    });

    it('maps "on_trial" to "active"', () => {
      expect(mapLemonSqueezyStatus('on_trial')).toBe('active');
    });

    it('maps "unpaid" to "past_due"', () => {
      expect(mapLemonSqueezyStatus('unpaid')).toBe('past_due');
    });

    it('maps "paused" to "canceled"', () => {
      expect(mapLemonSqueezyStatus('paused')).toBe('canceled');
    });

    it('maps unknown statuses to "incomplete"', () => {
      expect(mapLemonSqueezyStatus('something_else')).toBe('incomplete');
      expect(mapLemonSqueezyStatus('')).toBe('incomplete');
    });
  });

  describe('verifyLemonSqueezyWebhookSignature', () => {
    it('returns true for valid HMAC-SHA256 signature', () => {
      const body = '{"meta":{"event_name":"subscription_created"}}';
      const sig = crypto
        .createHmac('sha256', 'ls_test_secret')
        .update(body)
        .digest('hex');

      expect(verifyLemonSqueezyWebhookSignature(body, sig)).toBe(true);
    });

    it('returns false for invalid signature', () => {
      const body = '{"meta":{"event_name":"subscription_created"}}';
      expect(verifyLemonSqueezyWebhookSignature(body, 'invalid_hex')).toBe(false);
    });

    it('returns false for tampered body', () => {
      const body = '{"meta":{"event_name":"subscription_created"}}';
      const tamperedBody = '{"meta":{"event_name":"subscription_expired"}}';
      const sig = crypto
        .createHmac('sha256', 'ls_test_secret')
        .update(body)
        .digest('hex');

      expect(verifyLemonSqueezyWebhookSignature(tamperedBody, sig)).toBe(false);
    });

    it('returns false for empty signature', () => {
      expect(verifyLemonSqueezyWebhookSignature('body', '')).toBe(false);
    });
  });
});
