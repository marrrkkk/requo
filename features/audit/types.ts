export const auditEntityTypes = [
  "request",
  "quote",
  "business",
  "workspace",
  "member",
  "subscription",
  "account",
] as const;

export const auditSources = ["app", "webhook", "system"] as const;

export const auditActionLabels = {
  "request.archived": "Request archived",
  "request.trashed": "Request moved to trash",
  "request.restored": "Request restored",
  "quote.created": "Quote created",
  "quote.sent": "Quote sent",
  "quote.voided": "Quote voided",
  "quote.draft_deleted": "Draft quote deleted",
  "business.created": "Business created",
  "business.archived": "Business archived",
  "business.trashed": "Business moved to trash",
  "business.restored": "Business restored",
  "workspace.created": "Workspace created",
  "workspace.deletion_scheduled": "Workspace deletion scheduled",
  "workspace.deletion_canceled": "Workspace deletion canceled",
  "workspace.deleted": "Workspace deleted",
  "subscription.checkout_succeeded": "Subscription checkout succeeded",
  "subscription.plan_changed": "Plan changed",
  "subscription.cancellation_requested": "Subscription cancellation requested",
  "subscription.canceled": "Subscription canceled",
  "subscription.reactivated": "Subscription reactivated",
  "member.invited": "Member invited",
  "member.removed": "Member removed",
  "member.role_changed": "Member role changed",
  "account.deletion_requested": "Account deletion requested",
  "account.deleted": "Account deleted",
} as const;

export type AuditEntityType = (typeof auditEntityTypes)[number];
export type AuditSource = (typeof auditSources)[number];
export type AuditAction = keyof typeof auditActionLabels;

export type AuditLogMetadata = Record<string, unknown>;

export type AuditLogFilters = {
  actor: string | null;
  business: string | null;
  action: AuditAction | null;
  entity: AuditEntityType | null;
  from: string | null;
  to: string | null;
  page: number;
};

export type WorkspaceAuditLogItem = {
  id: string;
  workspaceId: string;
  businessId: string | null;
  businessName: string | null;
  businessSlug: string | null;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  entityType: AuditEntityType;
  entityId: string | null;
  action: AuditAction;
  metadata: AuditLogMetadata;
  source: AuditSource;
  createdAt: Date;
};

export type WorkspaceAuditLogPage = {
  items: WorkspaceAuditLogItem[];
  totalCount: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

export type WorkspaceAuditLogFilterOption = {
  label: string;
  value: string;
};

export type WorkspaceAuditLogFiltersView = {
  actors: WorkspaceAuditLogFilterOption[];
  businesses: WorkspaceAuditLogFilterOption[];
  actions: Array<{
    label: string;
    value: AuditAction;
  }>;
  entities: Array<{
    label: string;
    value: AuditEntityType;
  }>;
};
