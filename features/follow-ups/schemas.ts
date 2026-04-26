import { z } from "zod";

import {
  followUpChannels,
  followUpDueFilterValues,
  followUpSortValues,
  followUpStatusFilterValues,
} from "@/features/follow-ups/types";

function emptyToUndefined(value: unknown) {
  if (value == null) {
    return undefined;
  }

  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}

function firstString(value: unknown) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function coercePositiveInteger(fieldLabel: string) {
  return z.preprocess((value) => {
    const normalized = firstString(value);

    if (typeof normalized === "number") {
      return normalized;
    }

    if (typeof normalized !== "string") {
      return normalized;
    }

    const trimmed = normalized.trim();

    if (!trimmed) {
      return Number.NaN;
    }

    return Number(trimmed);
  }, z.number().int(`${fieldLabel} must be a whole number.`).min(1, `${fieldLabel} must be at least 1.`));
}

function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export const followUpCreateSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Enter a follow-up title.")
      .max(160, "Follow-up titles must be 160 characters or fewer."),
    reason: z
      .string()
      .trim()
      .min(2, "Enter why this follow-up is needed.")
      .max(500, "Follow-up reasons must be 500 characters or fewer."),
    channel: z.enum(followUpChannels, {
      error: () => "Choose a follow-up channel.",
    }),
    dueDate: z
      .string()
      .trim()
      .refine(isValidDateInput, "Enter a valid due date."),
  })
  .strict();

export const followUpRescheduleSchema = z
  .object({
    dueDate: z
      .string()
      .trim()
      .refine(isValidDateInput, "Enter a valid due date."),
  })
  .strict();

export const followUpListFiltersSchema = z.object({
  q: z
    .preprocess(
      (value) => emptyToUndefined(firstString(value)),
      z
        .string()
        .trim()
        .max(120, "Search must be 120 characters or fewer.")
        .optional(),
    )
    .catch(undefined),
  status: z
    .preprocess(
      (value) => firstString(value) ?? "pending",
      z.enum(followUpStatusFilterValues),
    )
    .catch("pending"),
  due: z
    .preprocess(
      (value) => firstString(value) ?? "all",
      z.enum(followUpDueFilterValues),
    )
    .catch("all"),
  sort: z
    .preprocess(
      (value) => firstString(value) ?? "due_asc",
      z.enum(followUpSortValues),
    )
    .catch("due_asc"),
  page: coercePositiveInteger("Page").catch(1),
});

export type FollowUpCreateInput = z.infer<typeof followUpCreateSchema>;
export type FollowUpRescheduleInput = z.infer<typeof followUpRescheduleSchema>;
