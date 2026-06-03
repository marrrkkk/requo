import {
  Play,
  Inbox,
  CheckCircle2,
  Archive,
  FileText,
  Send,
  Eye,
  ThumbsUp,
  ThumbsDown,
  TimerOff,
  Briefcase,
  CircleCheck,
  Receipt,
  CreditCard,
  AlertTriangle,
  Bell,
  Clock,
  Mail,
  ArrowRightLeft,
  CalendarPlus,
  StickyNote,
  Copy,
  Filter,
  Hourglass,
  AlarmClock,
} from "lucide-react";

import type { TriggerType, ActionType } from "../../types";

export const triggers: { id: TriggerType; label: string; group: string; icon: typeof Play }[] = [
  { id: "inquiry.received", label: "Inquiry received", group: "Inquiries", icon: Inbox },
  { id: "inquiry.qualified", label: "Inquiry qualified", group: "Inquiries", icon: CheckCircle2 },
  { id: "inquiry.archived", label: "Inquiry archived", group: "Inquiries", icon: Archive },
  { id: "quote.created", label: "Quote created", group: "Quotes", icon: FileText },
  { id: "quote.sent", label: "Quote sent", group: "Quotes", icon: Send },
  { id: "quote.viewed", label: "Quote viewed", group: "Quotes", icon: Eye },
  { id: "quote.accepted", label: "Quote accepted", group: "Quotes", icon: ThumbsUp },
  { id: "quote.rejected", label: "Quote rejected", group: "Quotes", icon: ThumbsDown },
  { id: "quote.expired", label: "Quote expired", group: "Quotes", icon: TimerOff },
  { id: "job.created", label: "Job created", group: "Jobs", icon: Briefcase },
  { id: "job.completed", label: "Job completed", group: "Jobs", icon: CircleCheck },
  { id: "invoice.sent", label: "Invoice sent", group: "Invoices", icon: Receipt },
  { id: "invoice.paid", label: "Invoice paid", group: "Invoices", icon: CreditCard },
  { id: "invoice.overdue", label: "Invoice overdue", group: "Invoices", icon: AlertTriangle },
  { id: "follow_up.due", label: "Follow-up due", group: "Follow-ups", icon: Bell },
  { id: "follow_up.overdue", label: "Follow-up overdue", group: "Follow-ups", icon: Clock },
];

export const actionBlocks: { id: ActionType; label: string; icon: typeof Play; group: string }[] = [
  { id: "create_follow_up", label: "Create follow-up", icon: CalendarPlus, group: "Tasks" },
  { id: "send_email", label: "Send email", icon: Mail, group: "Communication" },
  { id: "send_notification", label: "Send notification", icon: Bell, group: "Communication" },
  { id: "add_internal_note", label: "Add internal note", icon: StickyNote, group: "Communication" },
  { id: "update_inquiry_status", label: "Update inquiry status", icon: ArrowRightLeft, group: "Status" },
  { id: "update_quote_status", label: "Update quote status", icon: ArrowRightLeft, group: "Status" },
  { id: "archive_inquiry", label: "Archive inquiry", icon: Archive, group: "Status" },
  { id: "create_job_from_quote", label: "Create job from quote", icon: Briefcase, group: "Workflow" },
  { id: "generate_invoice", label: "Generate invoice", icon: Receipt, group: "Workflow" },
  { id: "generate_draft_quote", label: "Generate draft quote", icon: FileText, group: "Workflow" },
  { id: "duplicate_quote", label: "Duplicate quote", icon: Copy, group: "Workflow" },
];

export const conditionBlocks = [
  { id: "condition", label: "Condition", icon: Filter, group: "Logic" },
];

// ---------------------------------------------------------------------------
// Condition type definitions (guided config)
// ---------------------------------------------------------------------------

export type ConditionValueType = "select" | "text" | "number" | "boolean";

export type ConditionTypeOption = {
  id: string;
  label: string;
  field: string;
  defaultOperator: string;
  valueType: ConditionValueType;
  /** Preset choices for select-type conditions */
  values?: string[];
  /** Operator options relevant to this condition type */
  operators: { value: string; label: string }[];
};

export const conditionTypeOptions: ConditionTypeOption[] = [
  {
    id: "inquiry_source",
    label: "Inquiry source",
    field: "inquiry.source",
    defaultOperator: "eq",
    valueType: "select",
    values: ["Website", "Email", "Phone", "Referral", "Social Media", "Walk-in", "Other"],
    operators: [
      { value: "eq", label: "is" },
      { value: "neq", label: "is not" },
    ],
  },
  {
    id: "contact_method",
    label: "Contact method",
    field: "inquiry.contactMethod",
    defaultOperator: "eq",
    valueType: "select",
    values: ["Email", "Phone", "SMS", "WhatsApp", "Messenger", "Instagram", "Other"],
    operators: [
      { value: "eq", label: "is" },
      { value: "neq", label: "is not" },
    ],
  },
  {
    id: "name_contains",
    label: "Name contains",
    field: "inquiry.name",
    defaultOperator: "contains",
    valueType: "text",
    operators: [
      { value: "contains", label: "contains" },
      { value: "not_contains", label: "does not contain" },
    ],
  },
  {
    id: "has_tag",
    label: "Has tag",
    field: "inquiry.tag",
    defaultOperator: "eq",
    valueType: "text",
    operators: [
      { value: "eq", label: "is" },
      { value: "neq", label: "is not" },
    ],
  },
  {
    id: "quote_amount",
    label: "Quote amount",
    field: "quote.amount",
    defaultOperator: "gte",
    valueType: "number",
    operators: [
      { value: "gte", label: "is at least" },
      { value: "lte", label: "is at most" },
      { value: "gt", label: "is above" },
      { value: "lt", label: "is below" },
      { value: "eq", label: "is exactly" },
    ],
  },
  {
    id: "days_inactive",
    label: "Days inactive",
    field: "lastActivity.daysAgo",
    defaultOperator: "gte",
    valueType: "number",
    operators: [
      { value: "gte", label: "at least" },
      { value: "lte", label: "at most" },
      { value: "eq", label: "exactly" },
    ],
  },
  {
    id: "quote_viewed",
    label: "Quote has been viewed",
    field: "quote.viewed",
    defaultOperator: "eq",
    valueType: "boolean",
    operators: [
      { value: "eq", label: "is" },
      { value: "neq", label: "is not" },
    ],
  },
  {
    id: "has_attachment",
    label: "Inquiry has attachment",
    field: "inquiry.hasAttachment",
    defaultOperator: "eq",
    valueType: "boolean",
    operators: [
      { value: "eq", label: "is" },
      { value: "neq", label: "is not" },
    ],
  },
  {
    id: "repeat_customer",
    label: "Repeat customer",
    field: "contact.isRepeat",
    defaultOperator: "eq",
    valueType: "boolean",
    operators: [
      { value: "eq", label: "is" },
      { value: "neq", label: "is not" },
    ],
  },
  {
    id: "business_hours",
    label: "During business hours",
    field: "time.isBusinessHours",
    defaultOperator: "eq",
    valueType: "boolean",
    operators: [
      { value: "eq", label: "is" },
      { value: "neq", label: "is not" },
    ],
  },
];

/** Resolve a human-readable summary for a condition config */
export function getConditionSummary(config: Record<string, unknown>): string {
  const conditionType = config.conditionType as string | undefined;
  const field = config.field as string | undefined;
  const operator = config.operator as string | undefined;
  const value = config.value as string | number | boolean | undefined;

  // Find the matching condition type definition
  const typeDef = conditionTypeOptions.find(
    (ct) => ct.id === conditionType || ct.field === field,
  );

  if (!typeDef) return "Not configured";

  const operatorLabel =
    typeDef.operators.find((o) => o.value === operator)?.label ?? operator ?? "is";

  if (typeDef.valueType === "boolean") {
    // "Quote has been viewed" or "Quote has not been viewed"
    const isNegated = operator === "neq";
    return isNegated ? `${typeDef.label} — no` : `${typeDef.label} — yes`;
  }

  if (!value && value !== 0) return `${typeDef.label}`;
  return `${typeDef.label} ${operatorLabel} ${value}`;
}

export const delayBlocks = [
  { id: "delay", label: "Delay", icon: Clock, group: "Timing" },
  { id: "wait_until", label: "Wait until", icon: Hourglass, group: "Timing" },
  { id: "schedule_for", label: "Schedule for", icon: AlarmClock, group: "Timing" },
];

export const triggerLabels: Record<string, string> = Object.fromEntries(
  triggers.map((t) => [t.id, t.label]),
);

export const actionLabels: Record<string, string> = Object.fromEntries(
  actionBlocks.map((a) => [a.id, a.label]),
);
