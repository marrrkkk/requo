import "server-only";

import { eq } from "drizzle-orm";

import { getStarterTemplateDefinition } from "@/features/businesses/starter-templates";
import type { BusinessType } from "@/features/inquiries/business-types";
import { createInquiryFormPreset } from "@/features/inquiries/inquiry-forms";
import { createInquiryFormConfigDefaults } from "@/features/inquiries/form-config";
import { createInquiryPageConfigDefaults } from "@/features/inquiries/page-config";
import { ensureProfileForUser } from "@/lib/auth/business-bootstrap";
import { db } from "@/lib/db/client";
import {
  activityLogs,
  businessInquiryForms,
  businessMembers,
  businesses,
  replySnippets,
} from "@/lib/db/schema";
import { appendRandomSlugSuffix, slugifyPublicName } from "@/lib/slugs";

type CreateBusinessForUserInput = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  workspaceId: string;
  defaultCurrency: string;
  name: string;
  businessType: BusinessType;
  countryCode?: string | null;
  shortDescription?: string | null;
  activitySource?: string;
  activitySummary?: string;
};

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

async function getAvailableBusinessSlug(
  tx: DatabaseTransaction,
  baseSlug: string,
) {
  let candidate = baseSlug;

  while (true) {
    const [existingBusiness] = await tx
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.slug, candidate))
      .limit(1);

    if (!existingBusiness) {
      return candidate;
    }

    candidate = appendRandomSlugSuffix(baseSlug, {
      fallback: "business",
    });
  }
}

type CreateBusinessRecordForUserInput = CreateBusinessForUserInput & {
  tx: DatabaseTransaction;
  now?: Date;
};

export async function createBusinessRecordForUser({
  tx,
  workspaceId,
  defaultCurrency,
  user,
  name,
  businessType,
  countryCode = null,
  shortDescription,
  activitySource = "business-hub",
  activitySummary = "Business created.",
  now = new Date(),
}: CreateBusinessRecordForUserInput) {
  const trimmedName = name.trim();
  const normalizedShortDescription = shortDescription?.trim() || null;
  const starterTemplate = getStarterTemplateDefinition(businessType);
  const slug = await getAvailableBusinessSlug(
    tx,
    slugifyPublicName(trimmedName, {
      fallback: "business",
    }),
  );
  const businessId = createId("biz");
  const defaultInquiryForm = createInquiryFormPreset({
    businessType,
    businessName: trimmedName,
  });

  await tx.insert(businesses).values({
    id: businessId,
    workspaceId,
    name: trimmedName,
    slug,
    businessType,
    countryCode,
    shortDescription: normalizedShortDescription,
    contactEmail: user.email,
    inquiryFormConfig: createInquiryFormConfigDefaults({
      businessType,
    }),
    inquiryPageConfig: createInquiryPageConfigDefaults({
      businessName: trimmedName,
      businessType,
    }),
    defaultQuoteNotes: starterTemplate.defaultQuoteNotes,
    defaultQuoteValidityDays: starterTemplate.defaultQuoteValidityDays,
    defaultCurrency,
    createdAt: now,
    updatedAt: now,
  });

  await tx.insert(businessInquiryForms).values({
    id: createId("ifm"),
    businessId,
    name: defaultInquiryForm.name,
    slug: defaultInquiryForm.slug,
    businessType: defaultInquiryForm.businessType,
    isDefault: true,
    publicInquiryEnabled: defaultInquiryForm.publicInquiryEnabled,
    inquiryFormConfig: defaultInquiryForm.inquiryFormConfig,
    inquiryPageConfig: defaultInquiryForm.inquiryPageConfig,
    createdAt: now,
    updatedAt: now,
  });

  await tx.insert(businessMembers).values({
    id: createId("bm"),
    businessId,
    userId: user.id,
    role: "owner",
    createdAt: now,
    updatedAt: now,
  });

  if (starterTemplate.replySnippets.length) {
    await tx.insert(replySnippets).values(
      starterTemplate.replySnippets.map((snippet) => ({
        id: createId("rsn"),
        businessId,
        title: snippet.title,
        body: snippet.body,
        createdAt: now,
        updatedAt: now,
      })),
    );
  }

  await tx.insert(activityLogs).values({
    id: createId("act"),
    businessId,
    actorUserId: user.id,
    type: "business.created",
    summary: activitySummary,
    metadata: {
      source: activitySource,
    },
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: businessId,
    slug,
  };
}

export async function createBusinessForUser({
  workspaceId,
  defaultCurrency,
  user,
  name,
  businessType,
  countryCode,
  shortDescription,
  activitySource,
  activitySummary,
}: CreateBusinessForUserInput) {
  await ensureProfileForUser(user);

  return db.transaction(async (tx) =>
    createBusinessRecordForUser({
      tx,
      workspaceId,
      defaultCurrency,
      user,
      name,
      businessType,
      countryCode,
      shortDescription,
      activitySource,
      activitySummary,
    }),
  );
}
