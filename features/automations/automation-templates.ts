import type {
  ActionConfig,
  DelayConfig,
  TriggerType,
} from "./types";

// ---------------------------------------------------------------------------
// Workflow templates — opt-in only (never auto-created for a business)
// ---------------------------------------------------------------------------

export type AutomationTemplateCategory =
  | "inquiry"
  | "quote"
  | "job"
  | "invoice"
  | "follow_up";

export type AutomationTemplate = {
  id: string;
  name: string;
  description: string;
  category: AutomationTemplateCategory;
  triggerType: TriggerType;
  actions: ActionConfig[];
  delay?: DelayConfig;
  /** When set, only shown for matching business types. Omit for all types. */
  businessTypes?: string[];
};

export const automationTemplates: AutomationTemplate[] = [
  // —— Response speed (recommended for all businesses) ——
  {
    id: "respond-within-hours",
    name: "Alert if no response in 4 hours",
    description:
      "Get notified if a new inquiry hasn't received any response within 4 hours. Speed wins jobs.",
    category: "inquiry",
    triggerType: "inquiry.received",
    actions: [
      {
        type: "send_notification",
        title: "Inquiry still unquoted",
        body: "A new inquiry has been waiting over 4 hours without a response. Respond now to stay ahead.",
      },
    ],
    delay: { unit: "hours", value: 4 },
  },
  {
    id: "auto-follow-up-no-quote-24h",
    name: "Follow up if no quote in 24 hours",
    description:
      "Create a follow-up task if an inquiry doesn't have a quote within 24 hours. Don't let warm leads go cold.",
    category: "inquiry",
    triggerType: "inquiry.received",
    actions: [
      {
        type: "create_follow_up",
        title: "Inquiry needs a quote",
        reason: "24 hours since inquiry — send a quote before the lead goes cold",
        channel: "email",
        dueDateOffsetDays: 0,
      },
    ],
    delay: { unit: "days", value: 1 },
  },
  // —— Inquiries ——
  {
    id: "notify-new-inquiry",
    name: "Notify on new inquiry",
    description:
      "Get notified the moment a new inquiry arrives so you can respond while the lead is warm.",
    category: "inquiry",
    triggerType: "inquiry.received",
    actions: [
      {
        type: "send_notification",
        title: "New inquiry received",
        body: "A new inquiry was submitted. Open it and send a quote.",
      },
    ],
  },
  {
    id: "follow-up-new-inquiry",
    name: "Follow up on new inquiry",
    description:
      "Create a follow-up task 1 day after an inquiry if you have not quoted yet.",
    category: "inquiry",
    triggerType: "inquiry.received",
    actions: [
      {
        type: "create_follow_up",
        title: "Follow up on new inquiry",
        reason: "Inquiry received — confirm scope and send a quote",
        channel: "email",
        dueDateOffsetDays: 0,
      },
    ],
    delay: { unit: "days", value: 1 },
  },
  {
    id: "draft-quote-when-qualified",
    name: "Draft quote when inquiry is qualified",
    description:
      "Start an AI draft quote as soon as you mark an inquiry qualified.",
    category: "inquiry",
    triggerType: "inquiry.qualified",
    actions: [{ type: "generate_draft_quote", useAi: true }],
    businessTypes: ["general_project_services", "trades", "consulting"],
  },
  {
    id: "archive-stale-inquiries",
    name: "Archive stale inquiries",
    description:
      "Archive inquiries with no activity after 14 days to keep your pipeline tidy.",
    category: "inquiry",
    triggerType: "inquiry.received",
    actions: [
      {
        type: "archive_inquiry",
        reason: "No activity for 14 days",
      },
    ],
    delay: { unit: "days", value: 14 },
    businessTypes: ["general_project_services", "trades"],
  },

  // —— Quotes ——
  {
    id: "follow-up-quote-viewed",
    name: "Follow up after quote viewed",
    description:
      "Create a follow-up 3 days after a customer views your quote without responding.",
    category: "quote",
    triggerType: "quote.viewed",
    actions: [
      {
        type: "create_follow_up",
        title: "Follow up on viewed quote",
        reason: "Quote was viewed but the customer has not responded",
        channel: "email",
        dueDateOffsetDays: 0,
      },
    ],
    delay: { unit: "days", value: 3 },
  },
  {
    id: "follow-up-quote-sent",
    name: "Follow up after quote sent",
    description:
      "Remind yourself to check in 5 days after sending a quote with no customer response.",
    category: "quote",
    triggerType: "quote.sent",
    actions: [
      {
        type: "create_follow_up",
        title: "Check in on sent quote",
        reason: "Quote sent — no acceptance or rejection yet",
        channel: "email",
        dueDateOffsetDays: 0,
      },
    ],
    delay: { unit: "days", value: 5 },
  },
  {
    id: "expire-quotes-30d",
    name: "Expire quotes after 30 days",
    description:
      "Mark quotes as expired when they stay unanswered 30 days after being sent.",
    category: "quote",
    triggerType: "quote.sent",
    actions: [{ type: "update_quote_status", status: "expired" }],
    delay: { unit: "days", value: 30 },
  },
  {
    id: "notify-quote-accepted",
    name: "Notify when quote is accepted",
    description:
      "Get notified immediately when a customer accepts a quote so you can book the job.",
    category: "quote",
    triggerType: "quote.accepted",
    actions: [
      {
        type: "send_notification",
        title: "Quote accepted",
        body: "A customer accepted a quote. Review next steps and schedule work.",
      },
    ],
  },
  {
    id: "notify-quote-rejected",
    name: "Notify when quote is rejected",
    description:
      "Get notified when a customer declines so you can follow up or adjust pricing.",
    category: "quote",
    triggerType: "quote.rejected",
    actions: [
      {
        type: "send_notification",
        title: "Quote declined",
        body: "A customer declined a quote. Consider a follow-up or revised quote.",
      },
    ],
  },
  {
    id: "job-on-acceptance",
    name: "Create job when quote accepted",
    description:
      "Automatically create a job from an accepted quote so work is ready to schedule.",
    category: "quote",
    triggerType: "quote.accepted",
    actions: [{ type: "create_job_from_quote" }],
    businessTypes: ["trades", "general_project_services"],
  },

  // —— Jobs ——
  {
    id: "generate-invoice-on-job-complete",
    name: "Generate invoice when job completes",
    description:
      "Create a draft invoice when a job is marked complete (due in 14 days).",
    category: "job",
    triggerType: "job.completed",
    actions: [{ type: "generate_invoice", dueOffsetDays: 14 }],
    businessTypes: ["trades", "general_project_services"],
  },

  // —— Invoices ——
  {
    id: "notify-invoice-overdue",
    name: "Remind on overdue invoice",
    description:
      "Send yourself a notification when an invoice passes its due date.",
    category: "invoice",
    triggerType: "invoice.overdue",
    actions: [
      {
        type: "send_notification",
        title: "Invoice overdue",
        body: "An invoice is past due. Follow up with the customer for payment.",
      },
    ],
  },

  // —— Follow-ups ——
  {
    id: "follow-up-overdue-reminder",
    name: "Remind on overdue follow-ups",
    description:
      "Get notified when a scheduled follow-up is overdue so nothing slips through.",
    category: "follow_up",
    triggerType: "follow_up.overdue",
    actions: [
      {
        type: "send_notification",
        title: "Follow-up overdue",
        body: "You have an overdue follow-up that needs attention.",
      },
    ],
    businessTypes: ["consulting", "general_project_services"],
  },
  {
    id: "follow-up-due-today",
    name: "Notify when follow-up is due",
    description:
      "Get a heads-up when a follow-up reaches its due date.",
    category: "follow_up",
    triggerType: "follow_up.due",
    actions: [
      {
        type: "send_notification",
        title: "Follow-up due today",
        body: "A follow-up is due. Complete it to keep the deal moving.",
      },
    ],
  },
];

const categoryOrder: AutomationTemplateCategory[] = [
  "inquiry",
  "quote",
  "job",
  "invoice",
  "follow_up",
];

export const automationTemplateCategoryLabels: Record<
  AutomationTemplateCategory,
  string
> = {
  inquiry: "Inquiries",
  quote: "Quotes",
  job: "Jobs",
  invoice: "Invoices",
  follow_up: "Follow-ups",
};

/**
 * Returns workflow templates for the template gallery.
 * Pass `businessType` to include type-specific templates.
 */
export function getAutomationTemplates(
  businessType?: string,
): AutomationTemplate[] {
  return automationTemplates.filter((template) => {
    if (!template.businessTypes?.length) {
      return true;
    }
    if (!businessType) {
      return false;
    }
    return template.businessTypes.includes(businessType);
  });
}

export function groupAutomationTemplatesByCategory(
  templates: AutomationTemplate[],
): { category: AutomationTemplateCategory; label: string; templates: AutomationTemplate[] }[] {
  return categoryOrder
    .map((category) => ({
      category,
      label: automationTemplateCategoryLabels[category],
      templates: templates.filter((t) => t.category === category),
    }))
    .filter((group) => group.templates.length > 0);
}
