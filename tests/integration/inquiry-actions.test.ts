import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest';
import { testDb, closeTestDb } from './db';
import {
  businessInquiryForms,
  businessMembers,
  businesses,
  inquiries,
  user,
  workspaceMembers,
  workspaces,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import {
  archiveInquiryAction,
  changeInquiryStatusAction,
  createManualInquiryAction,
  restoreInquiryFromTrashAction,
  trashInquiryAction,
  unarchiveInquiryAction,
} from '@/features/inquiries/actions';
import { createInquiryFormConfigDefaults } from '@/features/inquiries/form-config';
import { getBusinessInquiryPath } from '@/features/businesses/routes';
import { hasFeatureAccess } from '@/lib/plans/entitlements';

// Mock dependencies
vi.mock('@/lib/db/client', () => ({ db: testDb }));
vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: 'action-business' })
  })
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock('@/lib/auth/session', () => ({
  requireSession: vi.fn().mockResolvedValue({
    user: { id: 'test_user_w2' }
  }),
  requireUser: vi.fn().mockResolvedValue({ id: 'test_user_w2' })
}));

describe('features/inquiries/actions', () => {
  const mockedRedirect = vi.mocked(redirect);

  beforeAll(async () => {
    await testDb.delete(inquiries).where(eq(inquiries.businessId, 'test_biz_w2'));
    await testDb.delete(businessInquiryForms).where(eq(businessInquiryForms.id, 'test_form_w2'));
    await testDb.delete(businessMembers).where(eq(businessMembers.id, 'test_bm_1'));
    await testDb.delete(businesses).where(eq(businesses.id, 'test_biz_w2'));
    await testDb.delete(workspaceMembers).where(eq(workspaceMembers.id, 'test_wm_2'));
    await testDb.delete(workspaces).where(eq(workspaces.id, 'test_workspace_2'));
    await testDb.delete(user).where(eq(user.id, 'test_user_w2'));
    await testDb.insert(user).values({
      id: 'test_user_w2',
      name: 'Action Tester',
      email: 'test.action@example.com',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await testDb.insert(workspaces).values({
      id: 'test_workspace_2',
      name: 'Action Workspace',
      slug: 'action-workspace',
      plan: 'free',
      ownerUserId: 'test_user_w2',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await testDb.insert(workspaceMembers).values({
      id: 'test_wm_2',
      workspaceId: 'test_workspace_2',
      userId: 'test_user_w2',
      role: 'owner',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await testDb.insert(businesses).values({
      id: 'test_biz_w2',
      workspaceId: 'test_workspace_2',
      name: 'Action Business',
      slug: 'action-business',
      businessType: 'print_signage',
      countryCode: 'US',
      defaultCurrency: 'USD',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await testDb.insert(businessMembers).values({
      id: 'test_bm_1',
      businessId: 'test_biz_w2',
      userId: 'test_user_w2',
      role: 'owner',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Type asserting to 'any' to bypass strict schema constraints on dummy data insert
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formPayload: any = {
      id: 'test_form_w2',
      businessId: 'test_biz_w2',
      name: 'Test Form',
      slug: 'test-form',
      businessType: 'general_project_services',
      isDefault: true,
      publicInquiryEnabled: true,
      inquiryFormConfig: createInquiryFormConfigDefaults({
        businessType: 'general_project_services',
      }),
      inquiryPageConfig: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await testDb.insert(businessInquiryForms).values(formPayload);
  });

  afterAll(async () => {
    await testDb.delete(inquiries).where(eq(inquiries.businessId, 'test_biz_w2'));
    await testDb.delete(businessInquiryForms).where(eq(businessInquiryForms.id, 'test_form_w2'));
    await testDb.delete(businessMembers).where(eq(businessMembers.id, 'test_bm_1'));
    await testDb.delete(businesses).where(eq(businesses.id, 'test_biz_w2'));
    await testDb.delete(workspaceMembers).where(eq(workspaceMembers.id, 'test_wm_2'));
    await testDb.delete(workspaces).where(eq(workspaces.id, 'test_workspace_2'));
    await testDb.delete(user).where(eq(user.id, 'test_user_w2'));
    await closeTestDb();
  });

  async function createInquiryFixture(inquiryId: string) {
    await testDb.delete(inquiries).where(eq(inquiries.id, inquiryId));

    const [testInquiry] = await testDb.insert(inquiries).values({
      id: inquiryId,
      businessId: 'test_biz_w2',
      businessInquiryFormId: 'test_form_w2',
      status: 'new',
      subject: 'Test Subject',
      customerName: 'Customer',
      customerEmail: `${inquiryId}@example.com`,
      serviceCategory: 'Test',
      details: 'Some details',
      submittedFieldSnapshot: { version: 1, businessType: 'print_signage', fields: [] },
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    return testInquiry;
  }

  describe('request lifecycle actions', () => {
    it('creates a manual request and redirects to the new request detail page', async () => {
      mockedRedirect.mockClear();

      const formData = new FormData();
      formData.set('formSlug', 'test-form');
      formData.set('customerName', 'Manual Request Customer');
      formData.set('customerContactMethod', 'email');
      formData.set('customerContactHandle', 'manual.request@example.com');
      formData.set('serviceCategory', 'Vehicle wrap install');
      formData.set(
        'details',
        'Customer called to request a site visit and pricing for a storefront wrap.',
      );

      await expect(createManualInquiryAction({}, formData)).rejects.toThrow(
        /^NEXT_REDIRECT:/,
      );

      const [createdInquiry] = await testDb
        .select()
        .from(inquiries)
        .where(eq(inquiries.customerEmail, 'manual.request@example.com'));

      expect(createdInquiry).toBeDefined();
      expect(createdInquiry.businessId).toBe('test_biz_w2');
      expect(createdInquiry.businessInquiryFormId).toBe('test_form_w2');
      expect(createdInquiry.customerName).toBe('Manual Request Customer');
      expect(createdInquiry.source).toBe('manual-dashboard');
      expect(createdInquiry.status).toBe('new');
      expect(createdInquiry.submittedFieldSnapshot?.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'serviceCategory',
            displayValue: 'Vehicle wrap install',
          }),
          expect.objectContaining({
            id: 'details',
            displayValue:
              'Customer called to request a site visit and pricing for a storefront wrap.',
          }),
        ]),
      );
      expect(mockedRedirect).toHaveBeenCalledWith(
        getBusinessInquiryPath('action-business', createdInquiry.id),
      );
    });

    it('updates inquiry status successfully', async () => {
      const testInquiry = await createInquiryFixture('test_inquiry_1');

      const formData = new FormData();
      formData.set("status", "quoted");

      const actionFn = changeInquiryStatusAction.bind(null, testInquiry.id);
      const result = await actionFn({}, formData);

      expect(result?.error).toBeUndefined();

      const [updatedInquiry] = await testDb.select().from(inquiries).where(eq(inquiries.id, testInquiry.id));
      expect(updatedInquiry.status).toBe('quoted');
      expect(updatedInquiry.archivedAt).toBeNull();
      expect(updatedInquiry.deletedAt).toBeNull();
    });

    it('archives a request and blocks workflow changes until it is restored', async () => {
      const testInquiry = await createInquiryFixture('test_inquiry_2');

      const archiveFn = archiveInquiryAction.bind(null, testInquiry.id);
      const archiveResult = await archiveFn({}, new FormData());

      expect(archiveResult).toEqual({ success: 'Inquiry archived.' });

      const workflowFormData = new FormData();
      workflowFormData.set("status", "quoted");

      const changeStatusFn = changeInquiryStatusAction.bind(null, testInquiry.id);
      const lockedResult = await changeStatusFn({}, workflowFormData);

      expect(lockedResult).toEqual({
        error: 'Unarchive this inquiry before updating its workflow status.',
      });

      const restoreFn = unarchiveInquiryAction.bind(null, testInquiry.id);
      const restoreResult = await restoreFn({}, new FormData());

      expect(restoreResult).toEqual({ success: 'Inquiry restored to active.' });

      const [restoredInquiry] = await testDb.select().from(inquiries).where(eq(inquiries.id, testInquiry.id));
      expect(restoredInquiry.archivedAt).toBeNull();
      expect(restoredInquiry.deletedAt).toBeNull();
    }, 10000);

    it('moves a request to trash and restores it without hard deleting the row', async () => {
      const testInquiry = await createInquiryFixture('test_inquiry_3');

      const trashFn = trashInquiryAction.bind(null, testInquiry.id);
      const trashResult = await trashFn({}, new FormData());

      expect(trashResult).toEqual({ success: 'Inquiry moved to trash.' });

      const [trashedInquiry] = await testDb.select().from(inquiries).where(eq(inquiries.id, testInquiry.id));
      expect(trashedInquiry.deletedAt).not.toBeNull();

      const restoreFn = restoreInquiryFromTrashAction.bind(null, testInquiry.id);
      const restoreResult = await restoreFn({}, new FormData());

      expect(restoreResult).toEqual({ success: 'Inquiry restored from trash.' });

      const [restoredInquiry] = await testDb.select().from(inquiries).where(eq(inquiries.id, testInquiry.id));
      expect(restoredInquiry.deletedAt).toBeNull();
      expect(restoredInquiry.archivedAt).toBeNull();
    }, 10000);
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
