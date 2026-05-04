import type { WorkspacePlan } from "@/lib/plans/plans";

export type AdminContext = {
  userId: string;
  email: string;
  name: string;
};

export const adminAuditActions = [
  "ADMIN_VIEW_USER",
  "ADMIN_VIEW_WORKSPACE",
  "ADMIN_VIEW_BUSINESS",
  "ADMIN_VIEW_SUBSCRIPTION",
  "ADMIN_VIEW_DELETION_REQUEST",
  "ADMIN_CANCEL_DELETION_REQUEST",
  "ADMIN_MARK_DELETION_COMPLETED",
  "ADMIN_EXPORT_DATA",
] as const;

export type AdminAuditAction = (typeof adminAuditActions)[number];

export const adminAuditTargetTypes = [
  "user",
  "workspace",
  "business",
  "subscription",
  "deletion_request",
  "system",
] as const;

export type AdminAuditTargetType = (typeof adminAuditTargetTypes)[number];

export type AdminRequestMetadata = {
  ipAddress: string | null;
  userAgent: string | null;
};

export type AdminPageInfo = {
  page: number;
  pageCount: number;
  pageSize: number;
  totalCount: number;
};

export type AdminListFilters = {
  q: string;
  page: number;
};

export type AdminAuditLogFilters = {
  action: AdminAuditAction | "all";
  admin: string;
  from: string;
  page: number;
  targetId: string;
  targetType: AdminAuditTargetType | "all";
  to: string;
};

export type AdminWorkspaceStatus = "active" | "scheduled_deletion" | "deleted";
export type AdminBusinessStatus = "active" | "archived" | "trash";

export type AdminUsageLimitRow = {
  key: string;
  label: string;
  limit: number | null;
  plan: WorkspacePlan;
};
