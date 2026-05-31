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
  Phone,
  Globe,
  Tag,
  DollarSign,
  User,
  CalendarClock,
  Paperclip,
  UserCheck,
  Building2,
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
  { id: "condition", label: "If / else", icon: Filter, group: "Logic" },
  { id: "condition_source", label: "Inquiry source is", icon: Globe, group: "Filters" },
  { id: "condition_contact_method", label: "Contact method is", icon: Phone, group: "Filters" },
  { id: "condition_form", label: "From form", icon: FileText, group: "Filters" },
  { id: "condition_name_contains", label: "Name contains", icon: User, group: "Filters" },
  { id: "condition_tag", label: "Has tag", icon: Tag, group: "Filters" },
  { id: "condition_amount", label: "Quote amount above/below", icon: DollarSign, group: "Filters" },
  { id: "condition_days_inactive", label: "Days since last activity", icon: CalendarClock, group: "Filters" },
  { id: "condition_quote_viewed", label: "Quote has been viewed", icon: Eye, group: "Filters" },
  { id: "condition_has_attachment", label: "Inquiry has attachment", icon: Paperclip, group: "Filters" },
  { id: "condition_repeat_customer", label: "Repeat customer", icon: UserCheck, group: "Filters" },
  { id: "condition_business_hours", label: "Business hours", icon: Building2, group: "Filters" },
];

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
