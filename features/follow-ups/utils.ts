import type {
  FollowUpChannel,
  FollowUpDueBucket,
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

export function createFollowUpId() {
  return `fup_${crypto.randomUUID().replace(/-/g, "")}`;
}

export function createActivityId() {
  return `act_${crypto.randomUUID().replace(/-/g, "")}`;
}

export function getTodayUtcDateString(now = new Date()) {
  return now.toISOString().slice(0, 10);
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
): FollowUpDueBucket {
  if (input.status !== "pending") {
    return "done";
  }

  const dueDate = getDateInputValue(input.dueAt);
  const today = getTodayUtcDateString(now);

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
