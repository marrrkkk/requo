import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest';
import { testDb, closeTestDb } from '@/tests/support/db';
import {
  businessInquiryForms,
  businessMembers,
  businesses,
  inquiries,
  user,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  getInquiryDetailForBusiness,
  getInquiryListCountForBusiness,
  getInquiryListPageForBusiness,
  getUnreadInquiryCountForBusiness,
} from '@/features/inquiries/queries';
import { markInquiryViewedForBusiness } from '@/features/inquiries/mutations';
import { createInquiryFormConfigDefaults } from '@/features/inquiries/form-config';

// Mock dependencies
vi.mock('@/lib/db/client', () => ({ db: testDb }));
vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}));

const BUSINESS_ID = 'test_biz_unread';
const OTHER_BUSINESS_ID = 'test_biz_unread_other';
const USER_ID = 'test_user_unread';
const FORM_ID = 'test_form_unread';

const baseFilters = {
  view: 'active' as const,
  status: 'all' as const,
  form: 'all',
  source: 'all' as const,
  sort: 'newest' as const,
  escalated: false,
  unread: false,
};

describe('inquiry unread tracking', () => {
  beforeAll(async () => {
    await testDb.delete(inquiries).where(eq(inquiries.businessId, BUSINESS_ID));
    await testDb.delete(inquiries).where(eq(inquiries.businessId, OTHER_BUSINESS_ID));
    await testDb.delete(businessInquiryForms).where(eq(businessInquiryForms.id, FORM_ID));
    await testDb.delete(businessMembers).where(eq(businessMembers.businessId, BUSINESS_ID));
    await testDb.delete(businessMembers).where(eq(businessMembers.businessId, OTHER_BUSINESS_ID));
    await testDb.delete(businesses).where(eq(businesses.id, BUSINESS_ID));
    await testDb.delete(businesses).where(eq(businesses.id, OTHER_BUSINESS_ID));
    await testDb.delete(user).where(eq(user.id, USER_ID));

    await testDb.insert(user).values({
      id: USER_ID,
      name: 'Unread Tester',
      email: 'test.unread@example.com',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    for (const [id, slug] of [
      [BUSINESS_ID, 'unread-business'],
      [OTHER_BUSINESS_ID, 'unread-business-other'],
    ] as const) {
      await testDb.insert(businesses).values({
        id,
        ownerUserId: USER_ID,
        name: 'Unread Business',
        slug,
        businessType: 'print_signage',
        countryCode: 'US',
        defaultCurrency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await testDb.insert(businessMembers).values({
        id: `test_bm_unread_${id}`,
        businessId: id,
        userId: USER_ID,
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formPayload: any = {
      id: FORM_ID,
      businessId: BUSINESS_ID,
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
      updatedAt: new Date(),
    };

    await testDb.insert(businessInquiryForms).values(formPayload);
  });

  afterAll(async () => {
    await testDb.delete(inquiries).where(eq(inquiries.businessId, BUSINESS_ID));
    await testDb.delete(inquiries).where(eq(inquiries.businessId, OTHER_BUSINESS_ID));
    await testDb.delete(businessInquiryForms).where(eq(businessInquiryForms.id, FORM_ID));
    await testDb.delete(businessMembers).where(eq(businessMembers.businessId, BUSINESS_ID));
    await testDb.delete(businessMembers).where(eq(businessMembers.businessId, OTHER_BUSINESS_ID));
    await testDb.delete(businesses).where(eq(businesses.id, BUSINESS_ID));
    await testDb.delete(businesses).where(eq(businesses.id, OTHER_BUSINESS_ID));
    await testDb.delete(user).where(eq(user.id, USER_ID));
    await closeTestDb();
  });

  async function createUnreadFixture(inquiryId: string, businessId = BUSINESS_ID) {
    await testDb.delete(inquiries).where(eq(inquiries.id, inquiryId));

    const [row] = await testDb
      .insert(inquiries)
      .values({
        id: inquiryId,
        businessId,
        businessInquiryFormId: businessId === BUSINESS_ID ? FORM_ID : null,
        status: 'new',
        subject: 'Unread subject',
        customerName: 'Unread Customer',
        customerEmail: `${inquiryId}@example.com`,
        serviceCategory: null,
        source: 'manual',
        details: 'Unread details',
        submittedFieldSnapshot: { version: 1, businessType: 'print_signage', fields: [] },
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return row;
  }

  it('counts freshly created inquiries as unread and exposes isUnread on list items', async () => {
    await createUnreadFixture('test_unread_fresh_1');
    await createUnreadFixture('test_unread_fresh_2');

    const count = await getUnreadInquiryCountForBusiness({ businessId: BUSINESS_ID });
    expect(count).toBeGreaterThanOrEqual(2);

    const page = await getInquiryListPageForBusiness({
      businessId: BUSINESS_ID,
      filters: baseFilters,
      page: 1,
      pageSize: 50,
    });

    const fresh = page.filter((item) =>
      ['test_unread_fresh_1', 'test_unread_fresh_2'].includes(item.id),
    );
    expect(fresh).toHaveLength(2);
    expect(fresh.every((item) => item.isUnread)).toBe(true);
  });

  it('marks an inquiry viewed exactly once and records the viewer', async () => {
    await createUnreadFixture('test_unread_mark_1');

    const first = await markInquiryViewedForBusiness({
      businessId: BUSINESS_ID,
      inquiryId: 'test_unread_mark_1',
      actorUserId: USER_ID,
    });
    expect(first).toEqual({ marked: true });

    const [row] = await testDb
      .select()
      .from(inquiries)
      .where(eq(inquiries.id, 'test_unread_mark_1'));
    expect(row.firstViewedAt).not.toBeNull();
    expect(row.firstViewedBy).toBe(USER_ID);

    const second = await markInquiryViewedForBusiness({
      businessId: BUSINESS_ID,
      inquiryId: 'test_unread_mark_1',
      actorUserId: USER_ID,
    });
    expect(second).toEqual({ marked: false });

    const page = await getInquiryListPageForBusiness({
      businessId: BUSINESS_ID,
      filters: baseFilters,
      page: 1,
      pageSize: 50,
    });
    expect(page.find((item) => item.id === 'test_unread_mark_1')?.isUnread).toBe(false);
  });

  it('refuses to mark inquiries from another business', async () => {
    await createUnreadFixture('test_unread_other_1', OTHER_BUSINESS_ID);

    const result = await markInquiryViewedForBusiness({
      businessId: BUSINESS_ID,
      inquiryId: 'test_unread_other_1',
      actorUserId: USER_ID,
    });
    expect(result).toEqual({ marked: false });

    const [row] = await testDb
      .select()
      .from(inquiries)
      .where(eq(inquiries.id, 'test_unread_other_1'));
    expect(row.firstViewedAt).toBeNull();

    // The other business still counts it as unread.
    const otherCount = await getUnreadInquiryCountForBusiness({
      businessId: OTHER_BUSINESS_ID,
    });
    expect(otherCount).toBeGreaterThanOrEqual(1);
  });

  it('excludes archived and deleted inquiries from the unread count', async () => {
    await createUnreadFixture('test_unread_arch_1');
    await createUnreadFixture('test_unread_del_1');

    const before = await getUnreadInquiryCountForBusiness({ businessId: BUSINESS_ID });

    await testDb
      .update(inquiries)
      .set({ archivedAt: new Date(), archivedBy: USER_ID })
      .where(eq(inquiries.id, 'test_unread_arch_1'));
    await testDb
      .update(inquiries)
      .set({ deletedAt: new Date(), deletedBy: USER_ID })
      .where(eq(inquiries.id, 'test_unread_del_1'));

    const after = await getUnreadInquiryCountForBusiness({ businessId: BUSINESS_ID });
    expect(after).toBe(before - 2);
  });

  it('narrows the list page and count to unviewed inquiries when the unread filter is on', async () => {
    await createUnreadFixture('test_unread_filter_seen');
    await createUnreadFixture('test_unread_filter_unseen');
    await markInquiryViewedForBusiness({
      businessId: BUSINESS_ID,
      inquiryId: 'test_unread_filter_seen',
      actorUserId: USER_ID,
    });

    const unreadFilters = { ...baseFilters, unread: true };

    const page = await getInquiryListPageForBusiness({
      businessId: BUSINESS_ID,
      filters: unreadFilters,
      page: 1,
      pageSize: 50,
    });

    expect(page.length).toBeGreaterThan(0);
    expect(page.every((item) => item.isUnread)).toBe(true);
    expect(page.map((item) => item.id)).toContain('test_unread_filter_unseen');
    expect(page.map((item) => item.id)).not.toContain('test_unread_filter_seen');

    const filteredCount = await getInquiryListCountForBusiness({
      businessId: BUSINESS_ID,
      filters: unreadFilters,
    });
    expect(filteredCount).toBe(page.length);
  });

  it('exposes firstViewedAt on the inquiry detail', async () => {
    await createUnreadFixture('test_unread_detail_1');

    const beforeView = await getInquiryDetailForBusiness({
      businessId: BUSINESS_ID,
      inquiryId: 'test_unread_detail_1',
    });
    expect(beforeView?.firstViewedAt).toBeNull();

    await markInquiryViewedForBusiness({
      businessId: BUSINESS_ID,
      inquiryId: 'test_unread_detail_1',
      actorUserId: USER_ID,
    });

    // No request cache exists under vitest, so the detail query re-reads.
    const afterView = await getInquiryDetailForBusiness({
      businessId: BUSINESS_ID,
      inquiryId: 'test_unread_detail_1',
    });
    expect(afterView?.firstViewedAt).not.toBeNull();
  });
});
