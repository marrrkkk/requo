import {
  Archive,
  CircleAlert,
  CircleDot,
  Clock3,
  FileText,
  Trash2,
  Timer,
  Trophy,
} from "lucide-react";

import type {
  InquiryRecordState,
  InquiryStatus,
} from "@/features/inquiries/types";

export const inquiryStatusLabels: Record<InquiryStatus, string> = {
  new: "New",
  quoted: "Quoted",
  waiting: "Waiting",
  won: "Won",
  lost: "Lost",
  archived: "Archived",
  overdue: "Overdue",
};

export const inquiryStatusClassNames: Record<InquiryStatus, string> = {
  new: "border-sky-200/80 bg-sky-50 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/12 dark:text-sky-200",
  quoted:
    "border-violet-200/80 bg-violet-50 text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/12 dark:text-violet-200",
  waiting:
    "border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/12 dark:text-amber-200",
  won: "border-lime-200/80 bg-lime-50 text-lime-700 dark:border-lime-500/25 dark:bg-lime-500/12 dark:text-lime-200",
  lost: "border-rose-200/80 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/12 dark:text-rose-200",
  archived:
    "border-slate-200/80 bg-slate-100 text-slate-700 dark:border-slate-500/25 dark:bg-slate-500/12 dark:text-slate-200",
  overdue: "border-orange-200/80 bg-orange-50 text-orange-700 dark:border-orange-500/25 dark:bg-orange-500/12 dark:text-orange-200",
};

export const inquiryStatusIcons = {
  new: CircleDot,
  quoted: FileText,
  waiting: Clock3,
  won: Trophy,
  lost: CircleAlert,
  archived: Archive,
  overdue: Timer,
} as const;

export const inquiryRecordStateLabels: Record<
  Exclude<InquiryRecordState, "active">,
  string
> = {
  archived: "Archived",
  trash: "In trash",
};

export const inquiryRecordStateClassNames: Record<
  Exclude<InquiryRecordState, "active">,
  string
> = {
  archived:
    "border-slate-200/80 bg-slate-100 text-slate-700 dark:border-slate-500/25 dark:bg-slate-500/12 dark:text-slate-200",
  trash:
    "border-rose-200/80 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/12 dark:text-rose-200",
};

export const inquiryRecordStateIcons = {
  archived: Archive,
  trash: Trash2,
} as const;

const inquiryDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

const inquiryDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function getInquiryStatusLabel(status: InquiryStatus) {
  return inquiryStatusLabels[status];
}

export function getInquiryRecordStateLabel(
  state: Exclude<InquiryRecordState, "active">,
) {
  return inquiryRecordStateLabels[state];
}

export function formatInquiryDate(value: Date | string) {
  return inquiryDateFormatter.format(new Date(value));
}

export function formatInquiryDateTime(value: Date | string) {
  return inquiryDateTimeFormatter.format(new Date(value));
}

export function formatInquiryBudget(value: string | null) {
  return value?.trim() || "Not shared";
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
