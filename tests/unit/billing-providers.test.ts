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
    PADDLE_API_KEY: 'test_key',
    PADDLE_WEBHOOK_SECRET: 'pdl_test_secret',
    PADDLE_PRO_PRICE_ID: 'pri_pro_123',
    PADDLE_BUSINESS_PRICE_ID: 'pri_biz_456',
    PADDLE_ENVIRONMENT: 'sandbox',
  },
  isPayMongoConfigured: true,
  isPaddleConfigured: true,
}));

import { mapPayMongoStatus, verifyPayMongoWebhookSignature } from '@/lib/billing/providers/paymongo';
import { mapPaddleStatus, verifyPaddleWebhookSignature } from '@/lib/billing/providers/paddle';

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

describe('Paddle provider', () => {
  describe('mapPaddleStatus', () => {
    it('maps "active" to "active"', () => {
      expect(mapPaddleStatus('active')).toBe('active');
    });

    it('maps "past_due" to "past_due"', () => {
      expect(mapPaddleStatus('past_due')).toBe('past_due');
    });

    it('maps "canceled" to "canceled"', () => {
      expect(mapPaddleStatus('canceled')).toBe('canceled');
    });

    it('maps "paused" to "canceled"', () => {
      expect(mapPaddleStatus('paused')).toBe('canceled');
    });

    it('maps "trialing" to "active"', () => {
      expect(mapPaddleStatus('trialing')).toBe('active');
    });

    it('maps unknown statuses to "incomplete"', () => {
      expect(mapPaddleStatus('something_else')).toBe('incomplete');
      expect(mapPaddleStatus('')).toBe('incomplete');
    });
  });

  describe('verifyPaddleWebhookSignature', () => {
    it('returns true for valid signature', () => {
      const body = '{"event_type":"subscription.created"}';
      const timestamp = '1234567890';
      const signedPayload = `${timestamp}:${body}`;
      const sig = crypto
        .createHmac('sha256', 'pdl_test_secret')
        .update(signedPayload)
        .digest('hex');

      const header = `ts=${timestamp};h1=${sig}`;
      expect(verifyPaddleWebhookSignature(body, header)).toBe(true);
    });

    it('returns false for invalid signature', () => {
      const body = '{"event_type":"subscription.created"}';
      const header = 'ts=1234567890;h1=invalid_hex';
      expect(verifyPaddleWebhookSignature(body, header)).toBe(false);
    });

    it('returns false for tampered body', () => {
      const body = '{"event_type":"subscription.created"}';
      const tamperedBody = '{"event_type":"subscription.canceled"}';
      const timestamp = '1234567890';
      const signedPayload = `${timestamp}:${body}`;
      const sig = crypto
        .createHmac('sha256', 'pdl_test_secret')
        .update(signedPayload)
        .digest('hex');

      const header = `ts=${timestamp};h1=${sig}`;
      expect(verifyPaddleWebhookSignature(tamperedBody, header)).toBe(false);
    });

    it('returns false for empty signature header', () => {
      expect(verifyPaddleWebhookSignature('body', '')).toBe(false);
    });

    it('returns false when timestamp is missing', () => {
      expect(verifyPaddleWebhookSignature('body', 'h1=somesig')).toBe(false);
    });

    it('returns false when h1 is missing', () => {
      expect(verifyPaddleWebhookSignature('body', 'ts=123')).toBe(false);
    });
  });
});
