import { z } from "zod/v4";

import {
  adminAuditActions,
  adminAuditTargetTypes,
  type AdminAuditLogFilters,
  type AdminAuditAction,
  type AdminAuditTargetType,
  type AdminListFilters,
} from "@/features/admin/types";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function firstString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const pageSchema = z.coerce.number().int().min(1).max(10_000).catch(1);
const searchSchema = z.string().trim().max(120).catch("");
const textFilterSchema = z.string().trim().max(200).catch("");
const dateFilterSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .catch("");

export function parseAdminListFilters(
  searchParams: SearchParamsRecord,
): AdminListFilters {
  return {
    q: searchSchema.parse(firstString(searchParams.q) ?? ""),
    page: pageSchema.parse(firstString(searchParams.page) ?? "1"),
  };
}

export function parseAdminAuditLogFilters(
  searchParams: SearchParamsRecord,
): AdminAuditLogFilters {
  const action = firstString(searchParams.action);
  const targetType = firstString(searchParams.targetType);

  return {
    action:
      action && adminAuditActions.includes(action as AdminAuditAction)
        ? (action as AdminAuditAction)
        : "all",
    admin: textFilterSchema.parse(firstString(searchParams.admin) ?? ""),
    from: dateFilterSchema.parse(firstString(searchParams.from) ?? ""),
    page: pageSchema.parse(firstString(searchParams.page) ?? "1"),
    targetId: textFilterSchema.parse(firstString(searchParams.targetId) ?? ""),
    targetType:
      targetType &&
      adminAuditTargetTypes.includes(targetType as AdminAuditTargetType)
        ? (targetType as AdminAuditTargetType)
        : "all",
    to: dateFilterSchema.parse(firstString(searchParams.to) ?? ""),
  };
}

export const adminCancelWorkspaceDeletionSchema = z.object({
  workspaceId: z.string().trim().min(1),
  reason: z
    .string()
    .trim()
    .min(5, "Enter a short reason for canceling this deletion request.")
    .max(500, "Use 500 characters or fewer."),
});

export const adminCompleteWorkspaceDeletionSchema = z.object({
  workspaceId: z.string().trim().min(1),
  confirmation: z.string().trim().min(1),
  reason: z
    .string()
    .trim()
    .min(5, "Enter a short reason for completing this deletion request.")
    .max(500, "Use 500 characters or fewer."),
});
