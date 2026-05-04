import "server-only";

import { and, count, eq, isNull } from "drizzle-orm";

import { writeAuditLog } from "@/features/audit/mutations";
import type { BusinessRecordState } from "@/features/businesses/lifecycle";
import { getStarterTemplateDefinition } from "@/features/businesses/starter-templates";
import type { BusinessType } from "@/features/inquiries/business-types";
import { createInquiryFormPreset } from "@/features/inquiries/inquiry-forms";
import {
  createInquiryFormConfigDefaults,
  type InquiryFormConfig,
} from "@/features/inquiries/form-config";
import { createInquiryPageConfigDefaults } from "@/features/inquiries/page-config";
import { ensureProfileForUser } from "@/lib/auth/business-bootstrap";
import { db } from "@/lib/db/client";
import type { WorkspacePlan } from "@/lib/plans/plans";
import {
  activityLogs,
  businessInquiryForms,
  businessMembers,
  businesses,
  replySnippets,
  workspaces,
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
  starterTemplateBusinessType?: BusinessType;
  countryCode?: string | null;
  shortDescription?: string | null;
  inquiryFormConfigOverride?: InquiryFormConfig;
  workspacePlan?: WorkspacePlan;
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
  starterTemplateBusinessType = businessType,
  countryCode = null,
  shortDescription,
  inquiryFormConfigOverride,
  workspacePlan = "free",
  activitySource = "business-hub",
  activitySummary = "Business created.",
  now = new Date(),
}: CreateBusinessRecordForUserInput) {
  const trimmedName = name.trim();
  const normalizedShortDescription = shortDescription?.trim() || null;
  const starterTemplate = getStarterTemplateDefinition(
    starterTemplateBusinessType,
  );
  const slug = await getAvailableBusinessSlug(
    tx,
    slugifyPublicName(trimmedName, {
      fallback: "business",
    }),
  );
  const businessId = createId("biz");
  const defaultInquiryForm = createInquiryFormPreset({
    businessType: starterTemplateBusinessType,
    businessName: trimmedName,
    plan: workspacePlan,
  });
  const resolvedFormConfig =
    inquiryFormConfigOverride ??
    createInquiryFormConfigDefaults({ businessType: starterTemplateBusinessType });

  await tx.insert(businesses).values({
    id: businessId,
    workspaceId,
    name: trimmedName,
    slug,
        businessType,
        countryCode,
        shortDescription: normalizedShortDescription,
        contactEmail: user.email,
        inquiryFormConfig: resolvedFormConfig,
        inquiryPageConfig: createInquiryPageConfigDefaults({
          businessName: trimmedName,
          businessType: starterTemplateBusinessType,
          plan: workspacePlan,
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
    inquiryFormConfig: inquiryFormConfigOverride ?? defaultInquiryForm.inquiryFormConfig,
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

  await writeAuditLog(tx, {
    workspaceId,
    businessId,
    actorUserId: user.id,
    actorName: user.name,
    actorEmail: user.email,
    entityType: "business",
    entityId: businessId,
    action: "business.created",
    metadata: {
      businessName: trimmedName,
      businessSlug: slug,
      businessType,
      source: activitySource,
    },
    createdAt: now,
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
  starterTemplateBusinessType,
  countryCode,
  shortDescription,
  activitySource,
  activitySummary,
  workspacePlan,
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
      starterTemplateBusinessType,
      countryCode,
      shortDescription,
      activitySource,
      activitySummary,
      workspacePlan,
    }),
  );
}

type BusinessLifecycleMutationInput = {
  businessId: string;
  actorUserId: string;
};

type TrashBusinessInput = BusinessLifecycleMutationInput & {
  confirmation: string | null;
};

type BusinessLifecycleResult =
  | {
      ok: true;
      businessSlug: string;
      workspaceSlug: string;
      nextState: BusinessRecordState;
    }
  | {
      ok: false;
      reason:
        | "not-found"
        | "confirmation-mismatch"
        | "already-active"
        | "already-archived"
        | "already-trash"
        | "trash-required"
        | "last-active";
    };

async function getBusinessLifecycleTarget(businessId: string) {
  const [business] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      workspaceId: businesses.workspaceId,
      workspaceSlug: workspaces.slug,
      archivedAt: businesses.archivedAt,
      deletedAt: businesses.deletedAt,
    })
    .from(businesses)
    .innerJoin(workspaces, eq(businesses.workspaceId, workspaces.id))
    .where(eq(businesses.id, businessId))
    .limit(1);

  return business ?? null;
}

async function getActiveWorkspaceBusinessCount(workspaceId: string) {
  const [row] = await db
    .select({
      value: count(),
    })
    .from(businesses)
    .where(
      and(
        eq(businesses.workspaceId, workspaceId),
        isNull(businesses.archivedAt),
        isNull(businesses.deletedAt),
      ),
    );

  return Number(row?.value ?? 0);
}

export async function archiveBusiness({
  businessId,
  actorUserId,
}: BusinessLifecycleMutationInput): Promise<BusinessLifecycleResult> {
  const business = await getBusinessLifecycleTarget(businessId);

  if (!business) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  if (business.deletedAt) {
    return {
      ok: false,
      reason: "trash-required",
    };
  }

  if (business.archivedAt) {
    return {
      ok: false,
      reason: "already-archived",
    };
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(businesses)
      .set({
        archivedAt: now,
        archivedBy: actorUserId,
        deletedAt: null,
        deletedBy: null,
        updatedAt: now,
      })
      .where(eq(businesses.id, businessId));

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      actorUserId,
      type: "business.archived",
      summary: "Business archived.",
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog(tx, {
      workspaceId: business.workspaceId,
      businessId,
      actorUserId,
      entityType: "business",
      entityId: businessId,
      action: "business.archived",
      metadata: {
        businessName: business.name,
        businessSlug: business.slug,
      },
      createdAt: now,
    });
  });

  return {
    ok: true,
    businessSlug: business.slug,
    workspaceSlug: business.workspaceSlug,
    nextState: "archived",
  };
}

export async function unarchiveBusiness({
  businessId,
  actorUserId,
}: BusinessLifecycleMutationInput): Promise<BusinessLifecycleResult> {
  const business = await getBusinessLifecycleTarget(businessId);

  if (!business) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  if (business.deletedAt) {
    return {
      ok: false,
      reason: "trash-required",
    };
  }

  if (!business.archivedAt) {
    return {
      ok: false,
      reason: "already-active",
    };
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(businesses)
      .set({
        archivedAt: null,
        archivedBy: null,
        updatedAt: now,
      })
      .where(eq(businesses.id, businessId));

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      actorUserId,
      type: "business.restored",
      summary: "Business restored to active.",
      metadata: {
        from: "archived",
      },
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog(tx, {
      workspaceId: business.workspaceId,
      businessId,
      actorUserId,
      entityType: "business",
      entityId: businessId,
      action: "business.restored",
      metadata: {
        businessName: business.name,
        businessSlug: business.slug,
        from: "archived",
      },
      createdAt: now,
    });
  });

  return {
    ok: true,
    businessSlug: business.slug,
    workspaceSlug: business.workspaceSlug,
    nextState: "active",
  };
}

export async function trashBusiness({
  businessId,
  actorUserId,
  confirmation,
}: TrashBusinessInput): Promise<BusinessLifecycleResult> {
  const business = await getBusinessLifecycleTarget(businessId);

  if (!business) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  if (confirmation && confirmation.trim() !== business.name) {
    return {
      ok: false,
      reason: "confirmation-mismatch",
    };
  }

  if (business.deletedAt) {
    return {
      ok: false,
      reason: "already-trash",
    };
  }

  if (!business.archivedAt) {
    const activeBusinessCount = await getActiveWorkspaceBusinessCount(
      business.workspaceId,
    );

    if (activeBusinessCount <= 1) {
      return {
        ok: false,
        reason: "last-active",
      };
    }
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(businesses)
      .set({
        archivedAt: null,
        archivedBy: null,
        deletedAt: now,
        deletedBy: actorUserId,
        updatedAt: now,
      })
      .where(eq(businesses.id, businessId));

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      actorUserId,
      type: "business.trashed",
      summary: "Business moved to trash.",
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog(tx, {
      workspaceId: business.workspaceId,
      businessId,
      actorUserId,
      entityType: "business",
      entityId: businessId,
      action: "business.trashed",
      metadata: {
        businessName: business.name,
        businessSlug: business.slug,
      },
      createdAt: now,
    });
  });

  return {
    ok: true,
    businessSlug: business.slug,
    workspaceSlug: business.workspaceSlug,
    nextState: "trash",
  };
}

export async function restoreBusiness({
  businessId,
  actorUserId,
}: BusinessLifecycleMutationInput): Promise<BusinessLifecycleResult> {
  const business = await getBusinessLifecycleTarget(businessId);

  if (!business) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  if (!business.deletedAt) {
    return {
      ok: false,
      reason: "already-active",
    };
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(businesses)
      .set({
        archivedAt: null,
        archivedBy: null,
        deletedAt: null,
        deletedBy: null,
        updatedAt: now,
      })
      .where(eq(businesses.id, businessId));

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      actorUserId,
      type: "business.restored",
      summary: "Business restored from trash.",
      metadata: {
        from: "trash",
      },
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog(tx, {
      workspaceId: business.workspaceId,
      businessId,
      actorUserId,
      entityType: "business",
      entityId: businessId,
      action: "business.restored",
      metadata: {
        businessName: business.name,
        businessSlug: business.slug,
        from: "trash",
      },
      createdAt: now,
    });
  });

  return {
    ok: true,
    businessSlug: business.slug,
    workspaceSlug: business.workspaceSlug,
    nextState: "active",
  };
}
