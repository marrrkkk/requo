export const followUpStatuses = ["pending", "completed", "skipped"] as const;
export const followUpStatusFilterValues = ["all", ...followUpStatuses] as const;
export const followUpDueFilterValues = [
  "all",
  "overdue",
  "today",
  "upcoming",
] as const;
export const followUpSortValues = ["due_asc", "due_desc", "newest"] as const;
export const followUpChannels = [
  "email",
  "phone",
  "sms",
  "whatsapp",
  "messenger",
  "instagram",
  "other",
] as const;
export const followUpCategories = ["sales", "post_win"] as const;
export const followUpRecurrences = [
  "none",
  "daily",
  "every_3_days",
  "weekly",
  "biweekly",
  "monthly",
] as const;

export type FollowUpStatus = (typeof followUpStatuses)[number];
export type FollowUpStatusFilterValue =
  (typeof followUpStatusFilterValues)[number];
export type FollowUpDueFilterValue = (typeof followUpDueFilterValues)[number];
export type FollowUpSortValue = (typeof followUpSortValues)[number];
export type FollowUpChannel = (typeof followUpChannels)[number];
export type FollowUpCategory = (typeof followUpCategories)[number];
export type FollowUpRecurrence = (typeof followUpRecurrences)[number];

export type FollowUpRelatedKind = "inquiry" | "quote";
export type FollowUpDueBucket = "overdue" | "today" | "upcoming" | "done";

export type FollowUpListFilters = {
  q?: string;
  status: FollowUpStatusFilterValue;
  due: FollowUpDueFilterValue;
  sort: FollowUpSortValue;
  page: number;
};

export type FollowUpListQueryFilters = Omit<FollowUpListFilters, "page">;

export type FollowUpView = {
  id: string;
  businessId: string;
  inquiryId: string | null;
  quoteId: string | null;
  assignedToUserId: string | null;
  createdByUserId: string | null;
  title: string;
  reason: string;
  category: FollowUpCategory;
  channel: FollowUpChannel;
  recurrence: FollowUpRecurrence;
  recurrenceCount: number;
  recurrenceLimit: number | null;
  dueAt: Date;
  completedAt: Date | null;
  skippedAt: Date | null;
  status: FollowUpStatus;
  createdAt: Date;
  updatedAt: Date;
  dueBucket: FollowUpDueBucket;
  customerName: string;
  customerEmail: string | null;
  customerContactMethod: string | null;
  customerContactHandle: string | null;
  related: {
    kind: FollowUpRelatedKind;
    id: string;
    label: string;
  };
  quoteNumber: string | null;
  quoteTitle: string | null;
  quotePublicUrl: string | null;
  quoteViewedAt: Date | null;
  suggestedMessage: string;
};

export type FollowUpOverviewData = {
  overdue: FollowUpView[];
  dueToday: FollowUpView[];
  upcoming: FollowUpView[];
  counts: {
    overdue: number;
    dueToday: number;
    upcoming: number;
  };
};

export type FollowUpCreateFieldErrors = Partial<
  Record<"title" | "reason" | "channel" | "dueDate" | "recurrence" | "recurrenceLimit", string[] | undefined>
>;

export type FollowUpEditFieldErrors = Partial<
  Record<"title" | "reason" | "channel" | "dueDate" | "recurrence" | "recurrenceLimit", string[] | undefined>
>;

export type FollowUpRescheduleFieldErrors = Partial<
  Record<"dueDate", string[] | undefined>
>;

export type FollowUpReassignFieldErrors = Partial<
  Record<"assignedToUserId", string[] | undefined>
>;

export type FollowUpCreateActionState = {
  error?: string;
  success?: string;
  fieldErrors?: FollowUpCreateFieldErrors;
  followUpId?: string;
};

export type FollowUpEditActionState = {
  error?: string;
  success?: string;
  fieldErrors?: FollowUpEditFieldErrors;
};

export type FollowUpRecordActionState = {
  error?: string;
  success?: string;
};

export type FollowUpRescheduleActionState = {
  error?: string;
  success?: string;
  fieldErrors?: FollowUpRescheduleFieldErrors;
};

export type FollowUpReassignActionState = {
  error?: string;
  success?: string;
  fieldErrors?: FollowUpReassignFieldErrors;
};

export type FollowUpDeleteActionState = {
  error?: string;
  success?: string;
};
