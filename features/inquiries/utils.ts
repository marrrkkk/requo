import {
  Archive,
  CircleAlert,
  CircleDot,
  Clock3,
  FileText,
  Trophy,
} from "lucide-react";

import type { InquiryStatus } from "@/features/inquiries/types";

export const inquiryStatusLabels: Record<InquiryStatus, string> = {
  new: "New",
  quoted: "Quoted",
  waiting: "Waiting",
  won: "Won",
  lost: "Lost",
  archived: "Archived",
};

export const inquiryStatusVariants: Record<
  InquiryStatus,
  "default" | "secondary" | "destructive" | "outline" | "ghost"
> = {
  new: "secondary",
  quoted: "outline",
  waiting: "ghost",
  won: "default",
  lost: "destructive",
  archived: "outline",
};

export const inquiryStatusIcons = {
  new: CircleDot,
  quoted: FileText,
  waiting: Clock3,
  won: Trophy,
  lost: CircleAlert,
  archived: Archive,
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
