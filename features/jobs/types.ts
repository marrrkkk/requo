export const jobStatuses = ["todo", "in_progress", "done"] as const;
export type JobStatus = (typeof jobStatuses)[number];

export const jobStatusFilterValues = ["all", ...jobStatuses] as const;
export type JobStatusFilterValue = (typeof jobStatusFilterValues)[number];

export const jobRecordViews = ["active", "archived"] as const;
export type JobRecordView = (typeof jobRecordViews)[number];

export type JobListFilters = {
  q?: string;
  view: JobRecordView;
  status: JobStatusFilterValue;
  sort: "newest" | "oldest";
  page: number;
};

export type DashboardJobListItem = {
  id: string;
  title: string;
  customerName: string;
  customerEmail: string | null;
  customerContactMethod: string;
  customerContactHandle: string;
  status: JobStatus;
  currency: string;
  totalInCents: number;
  quoteNumber: string;
  itemCount: number;
  completedItemCount: number;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  archivedAt: Date | null;
};

export type DashboardJobItem = {
  id: string;
  description: string;
  quantity: number;
  unitPriceInCents: number;
  lineTotalInCents: number;
  position: number;
  completedAt: Date | null;
};

export type DashboardJobDetail = {
  id: string;
  businessId: string;
  quoteId: string;
  title: string;
  customerName: string;
  customerEmail: string | null;
  customerContactMethod: string;
  customerContactHandle: string;
  status: JobStatus;
  currency: string;
  totalInCents: number;
  notes: string | null;
  quoteNumber: string;
  quoteTitle: string;
  startedAt: Date | null;
  completedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: DashboardJobItem[];
};

export type JobEditorActionState = {
  error?: string;
  success?: string;
};

export type JobStatusChangeActionState = {
  error?: string;
  success?: string;
};

export type JobItemToggleActionState = {
  error?: string;
  success?: string;
};
