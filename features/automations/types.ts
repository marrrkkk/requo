import { z } from "zod";

// ---------------------------------------------------------------------------
// Trigger Types
// ---------------------------------------------------------------------------

export const triggerTypes = [
  "inquiry.received",
  "inquiry.qualified",
  "inquiry.archived",
  "quote.created",
  "quote.sent",
  "quote.viewed",
  "quote.accepted",
  "quote.rejected",
  "quote.expired",
  "job.created",
  "job.completed",
  "invoice.sent",
  "invoice.paid",
  "invoice.overdue",
  "follow_up.due",
  "follow_up.overdue",
] as const;

export type TriggerType = (typeof triggerTypes)[number];

// ---------------------------------------------------------------------------
// Trigger Payloads
// ---------------------------------------------------------------------------

export type TriggerPayload = {
  "inquiry.received": {
    inquiryId: string;
    customerName: string;
    source: string;
    formId: string;
  };
  "inquiry.qualified": { inquiryId: string; qualifiedAt: string };
  "inquiry.archived": { inquiryId: string; reason: string };
  "quote.created": { quoteId: string; inquiryId: string; amount: number };
  "quote.sent": {
    quoteId: string;
    sentAt: string;
    recipientEmail: string;
  };
  "quote.viewed": { quoteId: string; viewedAt: string };
  "quote.accepted": {
    quoteId: string;
    acceptedAt: string;
    amount: number;
  };
  "quote.rejected": {
    quoteId: string;
    rejectedAt: string;
    reason?: string;
  };
  "quote.expired": { quoteId: string; expiredAt: string };
  "job.created": { jobId: string; quoteId: string; title: string };
  "job.completed": { jobId: string; completedAt: string };
  "invoice.sent": {
    invoiceId: string;
    jobId: string;
    amount: number;
    recipientEmail: string;
  };
  "invoice.paid": { invoiceId: string; paidAt: string; amount: number };
  "invoice.overdue": {
    invoiceId: string;
    dueDate: string;
    amount: number;
  };
  "follow_up.due": {
    followUpId: string;
    quoteId?: string;
    inquiryId?: string;
  };
  "follow_up.overdue": { followUpId: string; overdueBy: number };
};

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

export const conditionOperators = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "contains",
  "not_contains",
] as const;

export type ConditionOperator = (typeof conditionOperators)[number];

export const conditionSchema = z.object({
  field: z.string().min(1, "Condition field is required."),
  operator: z.enum(conditionOperators),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

export type Condition = z.infer<typeof conditionSchema>;

// ---------------------------------------------------------------------------
// Delay Config
// ---------------------------------------------------------------------------

export const delayUnits = ["minutes", "hours", "days"] as const;

export type DelayUnit = (typeof delayUnits)[number];

export const delayConfigSchema = z.object({
  unit: z.enum(delayUnits),
  value: z.number().int().min(1, "Delay value must be at least 1."),
});

export type DelayConfig = z.infer<typeof delayConfigSchema>;

// ---------------------------------------------------------------------------
// Action Types and Configs
// ---------------------------------------------------------------------------

export const actionTypes = [
  "create_follow_up",
  "send_notification",
  "send_email",
  "update_inquiry_status",
  "update_quote_status",
  "archive_inquiry",
  "create_job_from_quote",
  "generate_invoice",
  "generate_draft_quote",
] as const;

export type ActionType = (typeof actionTypes)[number];

export const createFollowUpConfigSchema = z.object({
  type: z.literal("create_follow_up"),
  title: z.string().min(1, "Follow-up title is required."),
  reason: z.string().min(1, "Follow-up reason is required."),
  channel: z.enum(["email", "phone", "sms", "other"]).default("email"),
  dueDateOffsetDays: z.number().int().min(1).default(3),
});

export const sendNotificationConfigSchema = z.object({
  type: z.literal("send_notification"),
  title: z.string().min(1, "Notification title is required."),
  body: z.string().optional(),
});

export const sendEmailConfigSchema = z.object({
  type: z.literal("send_email"),
  templateId: z.string().optional(),
  subject: z.string().min(1, "Email subject is required."),
  body: z.string().min(1, "Email body is required."),
  recipientEmail: z.string().email().optional(),
});

export const updateInquiryStatusConfigSchema = z.object({
  type: z.literal("update_inquiry_status"),
  status: z.string().min(1, "Target status is required."),
});

export const updateQuoteStatusConfigSchema = z.object({
  type: z.literal("update_quote_status"),
  status: z.string().min(1, "Target status is required."),
});

export const archiveInquiryConfigSchema = z.object({
  type: z.literal("archive_inquiry"),
  reason: z.string().optional(),
});

export const createJobFromQuoteConfigSchema = z.object({
  type: z.literal("create_job_from_quote"),
  title: z.string().optional(),
});

export const generateInvoiceConfigSchema = z.object({
  type: z.literal("generate_invoice"),
  dueOffsetDays: z.number().int().min(1).default(14),
});

export const generateDraftQuoteConfigSchema = z.object({
  type: z.literal("generate_draft_quote"),
  useAi: z.boolean().default(true),
});

export const actionConfigSchema = z.discriminatedUnion("type", [
  createFollowUpConfigSchema,
  sendNotificationConfigSchema,
  sendEmailConfigSchema,
  updateInquiryStatusConfigSchema,
  updateQuoteStatusConfigSchema,
  archiveInquiryConfigSchema,
  createJobFromQuoteConfigSchema,
  generateInvoiceConfigSchema,
  generateDraftQuoteConfigSchema,
]);

export type ActionConfig = z.infer<typeof actionConfigSchema>;

// ---------------------------------------------------------------------------
// Action Result
// ---------------------------------------------------------------------------

export type ActionResult = {
  success: boolean;
  result?: unknown;
  error?: string;
};

// ---------------------------------------------------------------------------
// Workflow Graph (multi-step automations)
// ---------------------------------------------------------------------------

export const workflowNodeTypes = [
  "trigger",
  "condition",
  "delay",
  "action",
] as const;

export type WorkflowNodeType = (typeof workflowNodeTypes)[number];

export const workflowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(workflowNodeTypes),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.unknown()),
});

export const workflowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().optional(),
});

export const workflowGraphSchema = z.object({
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
});

export type WorkflowNode = z.infer<typeof workflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof workflowEdgeSchema>;
export type WorkflowGraph = z.infer<typeof workflowGraphSchema>;

// ---------------------------------------------------------------------------
// Automation CRUD Schemas
// ---------------------------------------------------------------------------

export const createAutomationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Automation name is required.")
    .max(120, "Automation name must be 120 characters or fewer."),
  description: z
    .string()
    .trim()
    .max(500, "Description must be 500 characters or fewer.")
    .optional(),
  triggerType: z.enum(triggerTypes, {
    error: () => "Choose a trigger event.",
  }),
  triggerConfig: z.record(z.string(), z.unknown()).optional(),
  conditions: z.array(conditionSchema).optional(),
  actions: z.union([z.array(actionConfigSchema).min(1), workflowGraphSchema]),
  delay: delayConfigSchema.optional(),
  enabled: z.boolean().default(true),
  priority: z.number().int().min(0).default(0),
});

export const updateAutomationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Automation name is required.")
    .max(120, "Automation name must be 120 characters or fewer.")
    .optional(),
  description: z
    .string()
    .trim()
    .max(500, "Description must be 500 characters or fewer.")
    .nullable()
    .optional(),
  triggerType: z
    .enum(triggerTypes, { error: () => "Choose a trigger event." })
    .optional(),
  triggerConfig: z.record(z.string(), z.unknown()).nullable().optional(),
  conditions: z.array(conditionSchema).nullable().optional(),
  actions: z
    .union([z.array(actionConfigSchema).min(1), workflowGraphSchema])
    .optional(),
  delay: delayConfigSchema.nullable().optional(),
  enabled: z.boolean().optional(),
  priority: z.number().int().min(0).optional(),
});

export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;
export type UpdateAutomationInput = z.infer<typeof updateAutomationSchema>;
