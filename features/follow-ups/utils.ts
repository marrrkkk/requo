import type {
  FollowUpChannel,
  FollowUpDueBucket,
  FollowUpRecurrence,
  FollowUpStatus,
} from "@/features/follow-ups/types";

export const followUpStatusLabels: Record<FollowUpStatus, string> = {
  pending: "Pending",
  completed: "Completed",
  skipped: "Skipped",
};

export const followUpChannelLabels: Record<FollowUpChannel, string> = {
  email: "Email",
  phone: "Phone",
  sms: "SMS",
  whatsapp: "WhatsApp",
  messenger: "Messenger",
  instagram: "Instagram",
  other: "Other",
};

export const followUpDueBucketLabels: Record<FollowUpDueBucket, string> = {
  overdue: "Overdue",
  today: "Due today",
  upcoming: "Upcoming",
  done: "Done",
};

export const followUpRecurrenceLabels: Record<FollowUpRecurrence, string> = {
  none: "No repeat",
  daily: "Every day",
  every_3_days: "Every 3 days",
  weekly: "Every week",
  biweekly: "Every 2 weeks",
  monthly: "Every month",
};

export const followUpRecurrenceDays: Record<Exclude<FollowUpRecurrence, "none">, number> = {
  daily: 1,
  every_3_days: 3,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

export function createFollowUpId() {
  return `fup_${crypto.randomUUID().replace(/-/g, "")}`;
}

export function createActivityId() {
  return `act_${crypto.randomUUID().replace(/-/g, "")}`;
}

export function getTodayUtcDateString(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/**
 * Get today's date string in a specific timezone (IANA format).
 * Falls back to UTC if the timezone is invalid.
 */
export function getTodayDateStringInTimezone(timezone: string, now = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    return formatter.format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export function getFutureUtcDateString(daysAhead: number, now = new Date()) {
  return new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export function getQuickFollowUpDueDate(
  option: "tomorrow" | "3d" | "7d",
  now = new Date(),
) {
  switch (option) {
    case "tomorrow":
      return getFutureUtcDateString(1, now);
    case "7d":
      return getFutureUtcDateString(7, now);
    case "3d":
    default:
      return getFutureUtcDateString(3, now);
  }
}

export function parseFollowUpDueDateInput(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

export function getDateInputValue(value: Date | string) {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return value.toISOString().slice(0, 10);
}

export function getFollowUpDueBucket(
  input: {
    status: FollowUpStatus;
    dueAt: Date;
  },
  now = new Date(),
  timezone?: string,
): FollowUpDueBucket {
  if (input.status !== "pending") {
    return "done";
  }

  const dueDate = getDateInputValue(input.dueAt);
  const today = timezone
    ? getTodayDateStringInTimezone(timezone, now)
    : getTodayUtcDateString(now);

  if (dueDate < today) {
    return "overdue";
  }

  if (dueDate === today) {
    return "today";
  }

  return "upcoming";
}

export function getFollowUpStatusLabel(status: FollowUpStatus) {
  return followUpStatusLabels[status];
}

export function getFollowUpChannelLabel(channel: FollowUpChannel) {
  return followUpChannelLabels[channel];
}

export function getFollowUpDueBucketLabel(bucket: FollowUpDueBucket) {
  return followUpDueBucketLabels[bucket];
}

export function formatFollowUpDate(value: Date | string) {
  const date =
    typeof value === "string"
      ? new Date(`${value.slice(0, 10)}T00:00:00.000Z`)
      : value;

  if (Number.isNaN(date.getTime())) {
    return "Set a date";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

export function getDefaultFollowUpChannel(contactMethod?: string | null) {
  const normalized = contactMethod?.toLowerCase().trim();

  if (normalized === "email") {
    return "email" satisfies FollowUpChannel;
  }

  if (normalized === "phone" || normalized === "call") {
    return "phone" satisfies FollowUpChannel;
  }

  if (normalized === "sms" || normalized === "text") {
    return "sms" satisfies FollowUpChannel;
  }

  if (normalized === "whatsapp") {
    return "whatsapp" satisfies FollowUpChannel;
  }

  if (normalized === "messenger" || normalized === "facebook") {
    return "messenger" satisfies FollowUpChannel;
  }

  if (normalized === "instagram") {
    return "instagram" satisfies FollowUpChannel;
  }

  return "other" satisfies FollowUpChannel;
}

export function buildFollowUpSuggestedMessage(input: {
  kind: "inquiry" | "quote";
  businessName: string;
  customerName: string;
  quoteUrl?: string | null;
  quoteViewedAt?: Date | null;
}) {
  const customerName = input.customerName.trim() || "there";

  if (input.kind === "inquiry") {
    return `Hi ${customerName}, just following up on your inquiry with ${input.businessName}. Could you send any missing details when you have time?`;
  }

  if (input.quoteViewedAt) {
    const suffix = input.quoteUrl ? ` ${input.quoteUrl}` : "";

    return `Hi ${customerName}, I saw you had a chance to view the quote. Let us know if you have any questions or would like to proceed.${suffix}`;
  }

  if (input.quoteUrl) {
    return `Hi ${customerName}, just following up on the quote we sent: ${input.quoteUrl}. Let us know if you have any questions.`;
  }

  return `Hi ${customerName}, just following up on the quote we sent. Let us know if you have any questions.`;
}


export function getNextRecurrenceDueDate(
  currentDueAt: Date,
  recurrence: Exclude<FollowUpRecurrence, "none">,
): Date {
  const days = followUpRecurrenceDays[recurrence];
  const next = new Date(currentDueAt.getTime() + days * 24 * 60 * 60 * 1000);

  return next;
}

export function shouldRecur(input: {
  recurrence: FollowUpRecurrence;
  recurrenceCount: number;
  recurrenceLimit: number | null;
}): boolean {
  if (input.recurrence === "none") {
    return false;
  }

  if (input.recurrenceLimit !== null && input.recurrenceCount >= input.recurrenceLimit) {
    return false;
  }

  return true;
}

export function getFollowUpRecurrenceLabel(recurrence: FollowUpRecurrence) {
  return followUpRecurrenceLabels[recurrence];
}

/**
 * Compute due bucket using business timezone instead of UTC.
 */
export function getFollowUpDueBucketWithTimezone(
  input: {
    status: FollowUpStatus;
    dueAt: Date;
  },
  timezone: string,
  now = new Date(),
): FollowUpDueBucket {
  if (input.status !== "pending") {
    return "done";
  }

  const dueDate = getDateInputValue(input.dueAt);
  const today = getLocalDateString(now, timezone);

  if (dueDate < today) {
    return "overdue";
  }

  if (dueDate === today) {
    return "today";
  }

  return "upcoming";
}

/**
 * Get today's date string in the given IANA timezone.
 */
export function getLocalDateString(now: Date, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    return formatter.format(now);
  } catch {
    // Fallback to UTC if timezone is invalid
    return getTodayUtcDateString(now);
  }
}
