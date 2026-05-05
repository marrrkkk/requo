import { formatDistanceToNowStrict } from "date-fns";

import {
  getAuditActionLabel,
  getAuditEntityLabel,
} from "@/features/audit/constants";
import type { WorkspaceAuditLogItem } from "@/features/audit/types";

function getStringValue(
  metadata: Record<string, unknown>,
  key: string,
) {
  const value = metadata[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function formatAuditActorLabel(item: WorkspaceAuditLogItem) {
  if (item.actorName?.trim()) {
    return item.actorName;
  }

  if (item.actorEmail?.trim()) {
    return item.actorEmail;
  }

  if (item.source === "webhook") {
    return "Webhook";
  }

  if (item.source === "system") {
    return "System";
  }

  return "Unknown";
}

export function formatAuditEventDetails(item: WorkspaceAuditLogItem) {
  const metadata = item.metadata;

  switch (item.action) {
    case "request.archived":
    case "request.trashed":
    case "request.restored": {
      const customerName = getStringValue(metadata, "customerName");
      const serviceCategory = getStringValue(metadata, "serviceCategory");
      return [customerName, serviceCategory].filter(Boolean).join(" - ") || "Request record";
    }
    case "quote.created":
    case "quote.sent":
    case "quote.voided":
    case "quote.draft_deleted":
    case "quote.canceled_after_acceptance":
    case "quote.work_completed": {
      const quoteNumber = getStringValue(metadata, "quoteNumber");
      const title = getStringValue(metadata, "title");
      const customerName = getStringValue(metadata, "customerName");
      return [quoteNumber, title ?? customerName].filter(Boolean).join(" - ") || "Quote record";
    }
    case "business.created":
    case "business.archived":
    case "business.trashed":
    case "business.restored": {
      const businessName = getStringValue(metadata, "businessName");
      const businessSlug = getStringValue(metadata, "businessSlug");
      return [businessName, businessSlug ? `/${businessSlug}` : null]
        .filter(Boolean)
        .join(" - ");
    }
    case "workspace.created":
    case "workspace.deleted": {
      return getStringValue(metadata, "workspaceName") ?? "Workspace record";
    }
    case "workspace.deletion_scheduled":
    case "workspace.deletion_canceled": {
      const workspaceName = getStringValue(metadata, "workspaceName");
      const scheduledDeletionAt = getStringValue(metadata, "scheduledDeletionAt");
      return [workspaceName, scheduledDeletionAt].filter(Boolean).join(" - ");
    }
    case "workspace.ownership_transferred": {
      const newOwnerName = getStringValue(metadata, "newOwnerName");
      const newOwnerEmail = getStringValue(metadata, "newOwnerEmail");
      return [newOwnerName ?? newOwnerEmail, "is the new owner"].filter(Boolean).join(" ");
    }
    case "member.invited": {
      const email = getStringValue(metadata, "targetEmail");
      const role = getStringValue(metadata, "role");
      return [email, role ? `as ${role}` : null].filter(Boolean).join(" ");
    }
    case "member.removed": {
      const email = getStringValue(metadata, "targetEmail");
      const role = getStringValue(metadata, "removedRole");
      return [email, role].filter(Boolean).join(" - ");
    }
    case "member.role_changed": {
      const email = getStringValue(metadata, "targetEmail");
      const previousRole = getStringValue(metadata, "previousRole");
      const nextRole = getStringValue(metadata, "nextRole");
      const roleChange =
        previousRole && nextRole ? `${previousRole} -> ${nextRole}` : nextRole;
      return [email, roleChange].filter(Boolean).join(" - ");
    }
    case "subscription.checkout_succeeded":
    case "subscription.cancellation_requested":
    case "subscription.canceled":
    case "subscription.reactivated": {
      const plan = getStringValue(metadata, "plan");
      const provider = getStringValue(metadata, "provider");
      return [plan, provider].filter(Boolean).join(" - ");
    }
    case "subscription.plan_changed": {
      const previousPlan = getStringValue(metadata, "previousPlan");
      const nextPlan = getStringValue(metadata, "nextPlan");
      return [previousPlan, nextPlan ? `-> ${nextPlan}` : null]
        .filter(Boolean)
        .join(" ");
    }
    case "account.deletion_requested":
    case "account.deleted": {
      return getStringValue(metadata, "accountEmail") ?? "Account record";
    }
    default:
      return getStringValue(metadata, "summary") ?? getAuditActionLabel(item.action);
  }
}

export function formatAuditActionSummary(item: WorkspaceAuditLogItem) {
  return `${getAuditActionLabel(item.action)} - ${getAuditEntityLabel(item.entityType)}`;
}

export function formatAuditTimestamp(item: WorkspaceAuditLogItem) {
  return {
    absolute: formatDateTime(item.createdAt),
    relative: formatDistanceToNowStrict(item.createdAt, {
      addSuffix: true,
    }),
  };
}
