import { describe, expect, it } from "vitest";

import {
  followUpCreateSchema,
  followUpListFiltersSchema,
  followUpRescheduleSchema,
} from "@/features/follow-ups/schemas";

describe("features/follow-ups/schemas", () => {
  it("accepts a valid follow-up creation payload", () => {
    const result = followUpCreateSchema.safeParse({
      title: "Follow up with Taylor",
      reason: "Ask if they have the missing measurements.",
      channel: "email",
      dueDate: "2026-04-21",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid channels and invalid due dates", () => {
    const result = followUpCreateSchema.safeParse({
      title: "Follow up with Taylor",
      reason: "Ask if they have the missing measurements.",
      channel: "fax",
      dueDate: "not-a-date",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown fields for creation payloads", () => {
    const result = followUpCreateSchema.safeParse({
      title: "Follow up with Taylor",
      reason: "Ask if they have the missing measurements.",
      channel: "email",
      dueDate: "2026-04-21",
      sendAutomatically: true,
    });

    expect(result.success).toBe(false);
  });

  it("parses list filters with safe defaults", () => {
    expect(followUpListFiltersSchema.parse({})).toEqual({
      q: undefined,
      status: "pending",
      due: "all",
      sort: "due_asc",
      page: 1,
    });

    expect(
      followUpListFiltersSchema.parse({
        status: "completed",
        due: "today",
        sort: "newest",
        page: "2",
      }),
    ).toEqual({
      q: undefined,
      status: "completed",
      due: "today",
      sort: "newest",
      page: 2,
    });
  });

  it("validates reschedule due dates", () => {
    expect(
      followUpRescheduleSchema.safeParse({ dueDate: "2026-04-21" }).success,
    ).toBe(true);
    expect(
      followUpRescheduleSchema.safeParse({ dueDate: "2026-99-99" }).success,
    ).toBe(false);
  });
});
