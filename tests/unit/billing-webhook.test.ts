import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock "server-only" so the module can be imported
vi.mock('server-only', () => ({}));

// Mock db client
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockReturning = vi.fn();
const mockSet = vi.fn();
const mockValues = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/db/client', () => ({
  db: {
    select: () => ({ from: mockFrom }),
    insert: () => ({ values: mockValues }),
    update: () => ({ set: mockSet }),
  },
}));

vi.mock('@/lib/db/schema/subscriptions', () => ({
  billingEvents: {
    id: 'id',
    providerEventId: 'providerEventId',
    provider: 'provider',
    eventType: 'eventType',
    workspaceId: 'workspaceId',
    payload: 'payload',
    processedAt: 'processedAt',
    createdAt: 'createdAt',
  },
  paymentAttempts: {
    workspaceId: 'workspaceId',
    providerPaymentId: 'providerPaymentId',
    status: 'status',
  },
}));

import {
  webhookSuccess,
  webhookError,
} from '@/lib/billing/webhook-processor';

describe('lib/billing/webhook-processor', () => {
  describe('webhookSuccess', () => {
    it('returns a success result with message', () => {
      const result = webhookSuccess('Payment processed');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Payment processed');
      expect(result.workspaceId).toBeUndefined();
    });

    it('includes workspaceId when provided', () => {
      const result = webhookSuccess('OK', 'ws_123');
      expect(result.success).toBe(true);
      expect(result.message).toBe('OK');
      expect(result.workspaceId).toBe('ws_123');
    });
  });

  describe('webhookError', () => {
    it('returns an error result with message', () => {
      const result = webhookError('Invalid signature');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid signature');
      expect(result.workspaceId).toBeUndefined();
    });
  });
});
