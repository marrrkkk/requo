import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest';
import { testDb, closeTestDb } from './db';
import { user, workspaces, workspaceMembers, businesses, inquiries, businessInquiryForms, businessMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { changeInquiryStatusAction } from '@/features/inquiries/actions';
import { hasFeatureAccess } from '@/lib/plans/entitlements';

// Mock dependencies
vi.mock('@/lib/db/client', () => ({ db: testDb }));
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: 'action-business' })
  })
}));

vi.mock('@/lib/auth/session', () => ({
  requireSession: vi.fn().mockResolvedValue({
    user: { id: 'test_user_w2' }
  }),
  requireUser: vi.fn().mockResolvedValue({ id: 'test_user_w2' })
}));

describe('features/inquiries/actions', () => {
  beforeAll(async () => {
    await testDb.delete(user).where(eq(user.id, 'test_user_w2'));
    await testDb.delete(businesses).where(eq(businesses.id, 'test_biz_w2'));
    await testDb.delete(inquiries).where(eq(inquiries.id, 'test_inquiry_1'));
  });

  afterAll(async () => {
    await testDb.delete(inquiries).where(eq(inquiries.id, 'test_inquiry_1'));
    await testDb.delete(businessInquiryForms).where(eq(businessInquiryForms.id, 'test_form_w2'));
    await testDb.delete(businessMembers).where(eq(businessMembers.id, 'test_bm_1'));
    await testDb.delete(businesses).where(eq(businesses.id, 'test_biz_w2'));
    await testDb.delete(workspaceMembers).where(eq(workspaceMembers.id, 'test_wm_2'));
    await testDb.delete(workspaces).where(eq(workspaces.id, 'test_workspace_2'));
    await testDb.delete(user).where(eq(user.id, 'test_user_w2'));
    await closeTestDb();
  });

  describe('changeInquiryStatusAction', () => {
    it('updates inquiry status successfully', async () => {
      const [testUser] = await testDb.insert(user).values({
        id: 'test_user_w2',
        name: 'Action Tester',
        email: 'test.action@example.com',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      const [testWorkspace] = await testDb.insert(workspaces).values({
        id: 'test_workspace_2',
        name: 'Action Workspace',
        slug: 'action-workspace',
        plan: 'free',
        ownerUserId: testUser.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      await testDb.insert(workspaceMembers).values({
        id: 'test_wm_2',
        workspaceId: testWorkspace.id,
        userId: testUser.id,
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const [testBiz] = await testDb.insert(businesses).values({
        id: 'test_biz_w2',
        workspaceId: testWorkspace.id,
        name: 'Action Business',
        slug: 'action-business',
        businessType: 'print_signage',
        countryCode: 'US',
        defaultCurrency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      await testDb.insert(businessMembers).values({
        id: 'test_bm_1',
        businessId: testBiz.id,
        userId: testUser.id,
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Type asserting to 'any' to bypass strict schema constraints on dummy data insert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formPayload: any = {
        id: 'test_form_w2',
        businessId: testBiz.id,
        name: 'Test Form',
        slug: 'test-form',
        isDefault: true,
        inquiryFormConfig: {},
        inquiryPageConfig: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const [testForm] = await testDb.insert(businessInquiryForms).values(formPayload).returning();

      const [testInquiry] = await testDb.insert(inquiries).values({
        id: 'test_inquiry_1',
        businessId: testBiz.id,
        businessInquiryFormId: testForm.id,
        status: 'new',
        subject: 'Test Subject',
        customerName: 'Customer',
        customerEmail: 'customer@example.com',
        serviceCategory: 'Test',
        details: 'Some details',
        submittedFieldSnapshot: { version: 1, businessType: 'print_signage', fields: [] },
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      const formData = new FormData();
      formData.set("status", "quoted");

      const actionFn = changeInquiryStatusAction.bind(null, testInquiry.id);
      const result = await actionFn({}, formData);

      expect(result?.error).toBeUndefined();

      const [updatedInquiry] = await testDb.select().from(inquiries).where(eq(inquiries.id, testInquiry.id));
      expect(updatedInquiry.status).toBe('quoted');
    });
  });

  describe('hasFeatureAccess branding checks', () => {
    it('free plan does not have branding access', () => {
      expect(hasFeatureAccess('free', 'branding')).toBe(false);
    });

    it('pro plan has branding access', () => {
      expect(hasFeatureAccess('pro', 'branding')).toBe(true);
    });

    it('business plan has branding access', () => {
      expect(hasFeatureAccess('business', 'branding')).toBe(true);
    });
  });
});
