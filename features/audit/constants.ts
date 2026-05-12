import {
  auditActionLabels,
  auditEntityTypes,
  type AuditAction,
  type AuditEntityType,
} from "@/features/audit/types";

export const businessAuditPageSize = 25;

export const auditEntityLabels: Record<AuditEntityType, string> = {
  request: "Request",
  quote: "Quote",
  business: "Business",
  member: "Member",
  subscription: "Subscription",
  account: "Account",
};

export const auditEntityOptions = auditEntityTypes.map((value) => ({
  value,
  label: auditEntityLabels[value],
}));

export const auditActionOptions = Object.entries(auditActionLabels).map(
  ([value, label]) => ({
    value: value as AuditAction,
    label,
  }),
);

export function getAuditActionLabel(action: AuditAction) {
  return auditActionLabels[action];
}

export function getAuditEntityLabel(entityType: AuditEntityType) {
  return auditEntityLabels[entityType];
}
