import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { getNormalizedInquirySubmittedFieldSnapshot } from "@/features/inquiries/form-config";
import { getNormalizedInquiryPageConfig } from "@/features/inquiries/page-config";
import { normalizeBusinessType } from "@/features/inquiries/business-types";
import { buildBusinessKnowledgeContext } from "@/features/knowledge/queries";
import type { InquiryAssistantContext } from "@/features/ai/types";
import { db } from "@/lib/db/client";
import {
  inquiries,
  inquiryNotes,
  user,
  businessInquiryForms,
  businesses,
} from "@/lib/db/schema";

type GetInquiryAssistantContextForBusinessInput = {
  businessId: string;
  inquiryId: string;
};

export async function getInquiryAssistantContextForBusiness({
  businessId,
  inquiryId,
}: GetInquiryAssistantContextForBusinessInput): Promise<InquiryAssistantContext | null> {
  const [businessRow, inquiryRow, notes, knowledge] = await Promise.all([
    db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
        businessType: businesses.businessType,
        shortDescription: businesses.shortDescription,
        contactEmail: businesses.contactEmail,
        defaultCurrency: businesses.defaultCurrency,
        defaultEmailSignature: businesses.defaultEmailSignature,
        defaultQuoteNotes: businesses.defaultQuoteNotes,
        aiTonePreference: businesses.aiTonePreference,
      })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1),
    db
      .select({
        id: inquiries.id,
        businessInquiryFormId: inquiries.businessInquiryFormId,
        inquiryFormName: businessInquiryForms.name,
        inquiryFormSlug: businessInquiryForms.slug,
        inquiryFormBusinessType: businessInquiryForms.businessType,
        publicInquiryEnabled: businessInquiryForms.publicInquiryEnabled,
        inquiryPageConfig: businessInquiryForms.inquiryPageConfig,
        customerName: inquiries.customerName,
        customerEmail: inquiries.customerEmail,
        customerPhone: inquiries.customerPhone,
        companyName: inquiries.companyName,
        serviceCategory: inquiries.serviceCategory,
        requestedDeadline: inquiries.requestedDeadline,
        budgetText: inquiries.budgetText,
        subject: inquiries.subject,
        details: inquiries.details,
        source: inquiries.source,
        status: inquiries.status,
        submittedAt: inquiries.submittedAt,
        createdAt: inquiries.createdAt,
        submittedFieldSnapshot: inquiries.submittedFieldSnapshot,
      })
      .from(inquiries)
      .innerJoin(
        businessInquiryForms,
        eq(inquiries.businessInquiryFormId, businessInquiryForms.id),
      )
      .where(and(eq(inquiries.id, inquiryId), eq(inquiries.businessId, businessId)))
      .limit(1),
    db
      .select({
        id: inquiryNotes.id,
        body: inquiryNotes.body,
        createdAt: inquiryNotes.createdAt,
        authorName: user.name,
      })
      .from(inquiryNotes)
      .leftJoin(user, eq(inquiryNotes.authorUserId, user.id))
      .where(
        and(
          eq(inquiryNotes.businessId, businessId),
          eq(inquiryNotes.inquiryId, inquiryId),
        ),
      )
      .orderBy(desc(inquiryNotes.createdAt))
      .limit(6),
    buildBusinessKnowledgeContext(businessId),
  ]);

  const business = businessRow[0];
  const inquiry = inquiryRow[0];

  if (!business || !inquiry) {
    return null;
  }

  const inquiryFormBusinessType = normalizeBusinessType(
    inquiry.inquiryFormBusinessType,
  );

  const inquiryPageConfig = getNormalizedInquiryPageConfig(
    inquiry.inquiryPageConfig,
    {
      businessName: business.name,
      businessShortDescription: business.shortDescription,
      businessType: inquiryFormBusinessType,
    },
  );

  return {
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      shortDescription: business.shortDescription,
      contactEmail: business.contactEmail,
      defaultCurrency: business.defaultCurrency,
      defaultEmailSignature: business.defaultEmailSignature,
      defaultQuoteNotes: business.defaultQuoteNotes,
      aiTonePreference: business.aiTonePreference,
      inquiryPageHeadline: inquiryPageConfig.headline,
      inquiryPageTemplate: inquiryPageConfig.template,
      publicInquiryEnabled: inquiry.publicInquiryEnabled,
    },
    inquiry: {
      ...inquiry,
      inquiryFormBusinessType,
      submittedFieldSnapshot: getNormalizedInquirySubmittedFieldSnapshot(
        inquiry.submittedFieldSnapshot,
      ),
    },
    notes,
    knowledge,
  };
}
