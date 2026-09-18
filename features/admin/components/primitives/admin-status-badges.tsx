import {
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiErrorWarningLine,
  RiForbidLine,
  RiQuestionLine,
  RiSendPlaneLine,
  RiShieldCheckLine,
  RiSubtractLine,
  RiTimeLine,
} from "@remixicon/react";

import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { checkStatusLabel } from "@/features/admin/components/system/system-status-shared";
import type { AdminHealthCheckStatus } from "@/lib/admin/health-checks";
import type { EmailOutboxStatus } from "@/lib/db/schema/email";

/**
 * Admin-console status badges for the domains that have no customer-facing
 * badge of their own (account status, email delivery, AI call outcome,
 * integration health).
 *
 * All four compose the shared `StatusBadge`, so admin status colour comes from
 * the same tone vocabulary as the customer-facing badges. Status is never
 * communicated by colour alone — the label always renders.
 */

/* ── Account status ─────────────────────────────────────────────────────── */

export const adminUserAccountStatuses = [
  "active",
  "unverified",
  "suspended",
  "admin",
] as const;

export type AdminUserAccountStatus = (typeof adminUserAccountStatuses)[number];

/**
 * Derive the display status for an account from the fields the admin queries
 * already return. Suspension wins over everything: a banned admin is shown as
 * suspended, not as an admin.
 */
export function getAdminUserAccountStatus(user: {
  role: string | null;
  banned: boolean | null;
  emailVerified: boolean;
}): AdminUserAccountStatus {
  if (user.banned) {
    return "suspended";
  }

  if (user.role === "admin") {
    return "admin";
  }

  if (!user.emailVerified) {
    return "unverified";
  }

  return "active";
}

const adminUserStatusTones: Record<AdminUserAccountStatus, StatusTone> = {
  active: "success",
  unverified: "warning",
  suspended: "danger",
  // `progress` is a decorative hue, not a claim about progress — the admin role
  // has no success/failure meaning, it just needs to be distinguishable.
  admin: "progress",
};

const adminUserStatusLabels: Record<AdminUserAccountStatus, string> = {
  active: "Active",
  unverified: "Unverified",
  suspended: "Suspended",
  admin: "Admin",
};

const adminUserStatusIcons = {
  active: RiCheckboxCircleLine,
  unverified: RiErrorWarningLine,
  suspended: RiForbidLine,
  admin: RiShieldCheckLine,
} as const;

export function AdminUserStatusBadge({
  status,
  className,
}: {
  status: AdminUserAccountStatus;
  className?: string;
}) {
  return (
    <StatusBadge
      tone={adminUserStatusTones[status]}
      label={adminUserStatusLabels[status]}
      icon={adminUserStatusIcons[status]}
      className={className}
    />
  );
}

/* ── Email delivery status ──────────────────────────────────────────────── */

const emailStatusTones: Record<EmailOutboxStatus, StatusTone> = {
  pending: "neutral",
  sending: "active",
  sent: "success",
  failed: "danger",
  unknown: "warning",
};

const emailStatusLabels: Record<EmailOutboxStatus, string> = {
  pending: "Pending",
  sending: "Sending",
  sent: "Sent",
  failed: "Failed",
  unknown: "Unknown",
};

const emailStatusIcons = {
  pending: RiTimeLine,
  sending: RiSendPlaneLine,
  sent: RiCheckboxCircleLine,
  failed: RiCloseCircleLine,
  unknown: RiQuestionLine,
} as const;

export function AdminEmailStatusBadge({
  status,
  className,
}: {
  status: EmailOutboxStatus;
  className?: string;
}) {
  return (
    <StatusBadge
      tone={emailStatusTones[status]}
      label={emailStatusLabels[status]}
      icon={emailStatusIcons[status]}
      className={className}
    />
  );
}

/* ── AI call outcome ────────────────────────────────────────────────────── */

export type AdminAiCallStatus = "success" | "error";

const aiStatusTones: Record<AdminAiCallStatus, StatusTone> = {
  success: "success",
  error: "danger",
};

const aiStatusLabels: Record<AdminAiCallStatus, string> = {
  success: "Success",
  error: "Error",
};

const aiStatusIcons = {
  success: RiCheckboxCircleLine,
  error: RiCloseCircleLine,
} as const;

export function AdminAiStatusBadge({
  status,
  className,
}: {
  status: AdminAiCallStatus;
  className?: string;
}) {
  return (
    <StatusBadge
      tone={aiStatusTones[status]}
      label={aiStatusLabels[status]}
      icon={aiStatusIcons[status]}
      className={className}
    />
  );
}

/* ── Integration health ─────────────────────────────────────────────────── */

const healthStatusTones: Record<AdminHealthCheckStatus, StatusTone> = {
  pass: "success",
  warn: "warning",
  fail: "danger",
  skip: "neutral",
};

const healthStatusIcons = {
  pass: RiCheckboxCircleLine,
  warn: RiErrorWarningLine,
  fail: RiCloseCircleLine,
  skip: RiSubtractLine,
} as const;

/**
 * Labels come from `checkStatusLabel` rather than a local map so the badge and
 * the rest of the system page ("Healthy" / "Critical") cannot drift apart.
 */
export function AdminHealthStatusBadge({
  status,
  className,
}: {
  status: AdminHealthCheckStatus;
  className?: string;
}) {
  return (
    <StatusBadge
      tone={healthStatusTones[status]}
      label={checkStatusLabel(status)}
      icon={healthStatusIcons[status]}
      className={className}
    />
  );
}
