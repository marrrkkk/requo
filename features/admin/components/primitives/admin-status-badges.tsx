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

import { Badge } from "@/components/ui/badge";
import type { AdminHealthCheckStatus } from "@/lib/admin/health-checks";
import type { EmailOutboxStatus } from "@/lib/db/schema/email";
import { cn } from "@/lib/utils";

/**
 * Admin-console status badges for the domains that have no customer-facing
 * badge of their own (account status, email delivery, AI call outcome,
 * integration health).
 *
 * Deliberately follows the established per-domain convention used by
 * `QuoteStatusBadge` / `InquiryStatusBadge` / `InvoiceStatusBadge`: a class map
 * over the Tailwind palette, an icon, and an always-rendered text label — so
 * status is never communicated by colour alone. These are Tailwind palette
 * classes rather than CSS tokens because that is the convention the main app
 * already uses for status.
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

const adminUserStatusClassNames: Record<AdminUserAccountStatus, string> = {
  active:
    "!border-emerald-500/30 !bg-emerald-500/15 !text-emerald-800 dark:!border-emerald-500/25 dark:!bg-emerald-500/12 dark:!text-emerald-200",
  unverified:
    "!border-amber-500/30 !bg-amber-500/15 !text-amber-800 dark:!border-amber-500/25 dark:!bg-amber-500/12 dark:!text-amber-200",
  suspended:
    "!border-red-500/30 !bg-red-500/15 !text-red-800 dark:!border-red-500/25 dark:!bg-red-500/12 dark:!text-red-200",
  admin:
    "!border-indigo-500/30 !bg-indigo-500/15 !text-indigo-800 dark:!border-indigo-500/25 dark:!bg-indigo-500/12 dark:!text-indigo-200",
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
  const Icon = adminUserStatusIcons[status];

  return (
    <Badge
      className={cn(
        "shrink-0 rounded-full",
        adminUserStatusClassNames[status],
        className,
      )}
      variant="secondary"
    >
      <Icon data-icon="inline-start" aria-hidden />
      {adminUserStatusLabels[status]}
    </Badge>
  );
}

/* ── Email delivery status ──────────────────────────────────────────────── */

const emailStatusClassNames: Record<EmailOutboxStatus, string> = {
  pending:
    "!border-slate-500/25 !bg-slate-500/12 !text-slate-800 dark:!border-slate-500/25 dark:!bg-slate-500/12 dark:!text-slate-200",
  sending:
    "!border-cyan-500/30 !bg-cyan-500/15 !text-cyan-800 dark:!border-cyan-500/25 dark:!bg-cyan-500/12 dark:!text-cyan-200",
  sent: "!border-emerald-500/30 !bg-emerald-500/15 !text-emerald-800 dark:!border-emerald-500/25 dark:!bg-emerald-500/12 dark:!text-emerald-200",
  failed:
    "!border-red-500/30 !bg-red-500/15 !text-red-800 dark:!border-red-500/25 dark:!bg-red-500/12 dark:!text-red-200",
  unknown:
    "!border-amber-500/30 !bg-amber-500/15 !text-amber-800 dark:!border-amber-500/25 dark:!bg-amber-500/12 dark:!text-amber-200",
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
  const Icon = emailStatusIcons[status];

  return (
    <Badge
      className={cn(
        "shrink-0 rounded-full",
        emailStatusClassNames[status],
        className,
      )}
      variant="secondary"
    >
      <Icon data-icon="inline-start" aria-hidden />
      {emailStatusLabels[status]}
    </Badge>
  );
}

/* ── AI call outcome ────────────────────────────────────────────────────── */

export type AdminAiCallStatus = "success" | "error";

const aiStatusClassNames: Record<AdminAiCallStatus, string> = {
  success:
    "!border-emerald-500/30 !bg-emerald-500/15 !text-emerald-800 dark:!border-emerald-500/25 dark:!bg-emerald-500/12 dark:!text-emerald-200",
  error:
    "!border-red-500/30 !bg-red-500/15 !text-red-800 dark:!border-red-500/25 dark:!bg-red-500/12 dark:!text-red-200",
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
  const Icon = aiStatusIcons[status];

  return (
    <Badge
      className={cn("shrink-0 rounded-full", aiStatusClassNames[status], className)}
      variant="secondary"
    >
      <Icon data-icon="inline-start" aria-hidden />
      {aiStatusLabels[status]}
    </Badge>
  );
}

/* ── Integration health ─────────────────────────────────────────────────── */

const healthStatusClassNames: Record<AdminHealthCheckStatus, string> = {
  pass: "!border-emerald-500/30 !bg-emerald-500/15 !text-emerald-800 dark:!border-emerald-500/25 dark:!bg-emerald-500/12 dark:!text-emerald-200",
  warn: "!border-amber-500/30 !bg-amber-500/15 !text-amber-800 dark:!border-amber-500/25 dark:!bg-amber-500/12 dark:!text-amber-200",
  fail: "!border-red-500/30 !bg-red-500/15 !text-red-800 dark:!border-red-500/25 dark:!bg-red-500/12 dark:!text-red-200",
  skip: "!border-slate-500/25 !bg-slate-500/12 !text-slate-800 dark:!border-slate-500/25 dark:!bg-slate-500/12 dark:!text-slate-200",
};

const healthStatusLabels: Record<AdminHealthCheckStatus, string> = {
  pass: "Passing",
  warn: "Warning",
  fail: "Failing",
  skip: "Skipped",
};

const healthStatusIcons = {
  pass: RiCheckboxCircleLine,
  warn: RiErrorWarningLine,
  fail: RiCloseCircleLine,
  skip: RiSubtractLine,
} as const;

export function AdminHealthStatusBadge({
  status,
  className,
}: {
  status: AdminHealthCheckStatus;
  className?: string;
}) {
  const Icon = healthStatusIcons[status];

  return (
    <Badge
      className={cn(
        "shrink-0 rounded-full",
        healthStatusClassNames[status],
        className,
      )}
      variant="secondary"
    >
      <Icon data-icon="inline-start" aria-hidden />
      {healthStatusLabels[status]}
    </Badge>
  );
}
