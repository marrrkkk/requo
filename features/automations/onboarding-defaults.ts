import "server-only";

import { db } from "@/lib/db/client";
import { businessAutomations } from "@/lib/db/schema/automations";
import type { BusinessPlan } from "@/lib/plans/plans";

import { getAutomationLimit } from "./entitlements";
import type {
  ActionConfig,
  CreateAutomationInput,
  DelayConfig,
  TriggerType,
} from "./types";

// ---------------------------------------------------------------------------
// Onboarding Default Templates
// ---------------------------------------------------------------------------

/**
 * An automation template used during onboarding to pre-configure sensible
 * defaults for new businesses. Extends the standard create input with a
 * `source` field so templates are distinguishable in the UI.
 */
export type AutomationTemplate = Omit<CreateAutomationInput, "priority"> & {
  /** Marks the origin of the automation for UI labeling. */
  source: "suggested" | "custom";
  /** Optional business types this template applies to. Empty = all types. */
  businessTypes?: string[];
};

// ---------------------------------------------------------------------------
// Universal Default Templates (all business types)
// ---------------------------------------------------------------------------

const followUpAfterQuoteViewed: AutomationTemplate = {
  name: "Follow up after quote viewed",
  description:
    "Automatically create a follow-up task 3 days after a customer views your quote without responding.",
  triggerType: "quote.viewed" as TriggerType,
  actions: [
    {
      type: "create_follow_up",
      title: "Follow up on viewed quote",
      reason: "Quote viewed but no response after 3 days",
      channel: "email",
      dueDateOffsetDays: 0,
    } satisfies ActionConfig,
  ],
  delay: { unit: "days", value: 3 } satisfies DelayConfig,
  enabled: true,
  source: "suggested",
};

const expireQuotesAfter30Days: AutomationTemplate = {
  name: "Expire quotes after 30 days",
  description:
    "Automatically mark quotes as expired if they remain unanswered 30 days after being sent.",
  triggerType: "quote.sent" as TriggerType,
  actions: [
    {
      type: "update_quote_status",
      status: "expired",
    } satisfies ActionConfig,
  ],
  delay: { unit: "days", value: 30 } satisfies DelayConfig,
  enabled: true,
  source: "suggested",
};

const createJobOnAcceptance: AutomationTemplate = {
  name: "Create job when quote accepted",
  description:
    "Automatically create a new job from the accepted quote so you can start work immediately.",
  triggerType: "quote.accepted" as TriggerType,
  actions: [
    {
      type: "create_job_from_quote",
    } satisfies ActionConfig,
  ],
  enabled: true,
  source: "suggested",
};

const notifyOnNewInquiry: AutomationTemplate = {
  name: "Notify on new inquiry",
  description:
    "Get notified instantly when a new inquiry comes in so you never miss a lead.",
  triggerType: "inquiry.received" as TriggerType,
  actions: [
    {
      type: "send_notification",
      title: "New inquiry received",
      body: "A new inquiry has been submitted to your business.",
    } satisfies ActionConfig,
  ],
  enabled: true,
  source: "suggested",
};

// ---------------------------------------------------------------------------
// Business-Type-Specific Templates
// ---------------------------------------------------------------------------

const archiveStaleInquiries: AutomationTemplate = {
  name: "Archive stale inquiries",
  description:
    "Automatically archive inquiries that have been inactive for 14 days.",
  triggerType: "inquiry.received" as TriggerType,
  actions: [
    {
      type: "archive_inquiry",
      reason: "No activity for 14 days",
    } satisfies ActionConfig,
  ],
  delay: { unit: "days", value: 14 } satisfies DelayConfig,
  enabled: true,
  source: "suggested",
  businessTypes: ["general_services", "trades"],
};

const followUpOverdueReminder: AutomationTemplate = {
  name: "Follow-up overdue reminder",
  description:
    "Send yourself a notification when a follow-up task becomes overdue.",
  triggerType: "follow_up.overdue" as TriggerType,
  actions: [
    {
      type: "send_notification",
      title: "Overdue follow-up",
      body: "You have an overdue follow-up that needs attention.",
    } satisfies ActionConfig,
  ],
  enabled: true,
  source: "suggested",
  businessTypes: ["consulting", "general_services"],
};

const generateInvoiceOnJobComplete: AutomationTemplate = {
  name: "Generate invoice when job completes",
  description:
    "Automatically create a draft invoice when a job is marked complete.",
  triggerType: "job.completed" as TriggerType,
  actions: [
    {
      type: "generate_invoice",
      dueOffsetDays: 14,
    } satisfies ActionConfig,
  ],
  enabled: true,
  source: "suggested",
  businessTypes: ["trades", "general_services"],
};

// ---------------------------------------------------------------------------
// Template Registry
// ---------------------------------------------------------------------------

/** All available onboarding automation templates. */
const allTemplates: AutomationTemplate[] = [
  // Universal defaults (Requirement 8.2)
  followUpAfterQuoteViewed,
  expireQuotesAfter30Days,
  createJobOnAcceptance,
  notifyOnNewInquiry,
  // Business-type-specific
  archiveStaleInquiries,
  followUpOverdueReminder,
  generateInvoiceOnJobComplete,
];

/**
 * Returns onboarding default automation templates.
 *
 * If a `businessType` is provided, returns the universal defaults plus any
 * templates tagged for that business type. Otherwise returns only the
 * universal defaults.
 */
export function getOnboardingDefaults(
  businessType?: string,
): AutomationTemplate[] {
  const universalDefaults = allTemplates.filter((t) => !t.businessTypes);

  if (!businessType) {
    return universalDefaults;
  }

  const typeSpecific = allTemplates.filter((t) =>
    t.businessTypes?.includes(businessType),
  );

  return [...universalDefaults, ...typeSpecific];
}

/**
 * Converts an automation template into the shape expected by `createAutomation`,
 * stripping template-only fields and adding a default priority.
 */
export function templateToCreateInput(
  template: AutomationTemplate,
): CreateAutomationInput & { source: "suggested" | "custom" } {
  const { businessTypes: _businessTypes, source, ...input } = template;
  return { ...input, priority: 0, source };
}


// ---------------------------------------------------------------------------
// Onboarding Automation Creator (Requirements 8.3, 8.4)
// ---------------------------------------------------------------------------

/**
 * Creates default automation rules for a newly onboarded business.
 *
 * - Gets templates for the given business type
 * - Enables automations up to the plan limit
 * - Any beyond the limit are created disabled (user can upgrade to enable)
 */
export async function createOnboardingAutomations({
  businessId,
  userId,
  businessType,
  plan = "free",
}: {
  businessId: string;
  userId: string;
  businessType?: string;
  plan?: BusinessPlan;
}): Promise<{ created: number; enabledCount: number; disabledCount: number }> {
  const templates = getOnboardingDefaults(businessType);

  if (templates.length === 0) {
    return { created: 0, enabledCount: 0, disabledCount: 0 };
  }

  const limit = getAutomationLimit(plan);
  let enabledCount = 0;
  let disabledCount = 0;

  const values = templates.map((template, index) => {
    const input = templateToCreateInput(template);
    const withinLimit = enabledCount < limit;
    const enabled = input.enabled && withinLimit;

    if (enabled) {
      enabledCount++;
    } else {
      disabledCount++;
    }

    return {
      id: crypto.randomUUID(),
      businessId,
      name: input.name,
      description: input.description ?? null,
      triggerType: input.triggerType,
      triggerConfig: null,
      conditions: input.conditions ?? null,
      actions: input.actions,
      delay: input.delay ?? null,
      enabled,
      priority: index,
      createdByUserId: userId,
    };
  });

  try {
    await db.insert(businessAutomations).values(values);
  } catch (error) {
    // Log but don't fail onboarding if automation defaults can't be created
    console.error("Failed to create onboarding automation defaults.", error);
    return { created: 0, enabledCount: 0, disabledCount: 0 };
  }

  return { created: values.length, enabledCount, disabledCount };
}
