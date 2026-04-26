import { describe, expect, it } from "vitest";

import {
  buildFollowUpSuggestedMessage,
  getDefaultFollowUpChannel,
  getFollowUpDueBucket,
  getQuickFollowUpDueDate,
  parseFollowUpDueDateInput,
} from "@/features/follow-ups/utils";

describe("features/follow-ups/utils", () => {
  it("maps preferred contact methods to follow-up channels", () => {
    expect(getDefaultFollowUpChannel("email")).toBe("email");
    expect(getDefaultFollowUpChannel("text")).toBe("sms");
    expect(getDefaultFollowUpChannel("facebook")).toBe("messenger");
    expect(getDefaultFollowUpChannel("unknown")).toBe("other");
  });

  it("creates quick due dates from a stable clock", () => {
    const now = new Date("2026-04-20T10:00:00.000Z");

    expect(getQuickFollowUpDueDate("tomorrow", now)).toBe("2026-04-21");
    expect(getQuickFollowUpDueDate("3d", now)).toBe("2026-04-23");
    expect(getQuickFollowUpDueDate("7d", now)).toBe("2026-04-27");
  });

  it("classifies pending follow-ups by due date", () => {
    const now = new Date("2026-04-20T10:00:00.000Z");

    expect(
      getFollowUpDueBucket(
        {
          status: "pending",
          dueAt: parseFollowUpDueDateInput("2026-04-19"),
        },
        now,
      ),
    ).toBe("overdue");
    expect(
      getFollowUpDueBucket(
        {
          status: "pending",
          dueAt: parseFollowUpDueDateInput("2026-04-20"),
        },
        now,
      ),
    ).toBe("today");
    expect(
      getFollowUpDueBucket(
        {
          status: "pending",
          dueAt: parseFollowUpDueDateInput("2026-04-21"),
        },
        now,
      ),
    ).toBe("upcoming");
    expect(
      getFollowUpDueBucket(
        {
          status: "completed",
          dueAt: parseFollowUpDueDateInput("2026-04-19"),
        },
        now,
      ),
    ).toBe("done");
  });

  it("generates short manual copy for inquiry and quote follow-ups", () => {
    expect(
      buildFollowUpSuggestedMessage({
        kind: "inquiry",
        businessName: "Requo Demo",
        customerName: "Taylor",
      }),
    ).toBe(
      "Hi Taylor, just following up on your inquiry with Requo Demo. Could you send any missing details when you have time?",
    );

    expect(
      buildFollowUpSuggestedMessage({
        kind: "quote",
        businessName: "Requo Demo",
        customerName: "Taylor",
        quoteUrl: "https://requo.test/quote/token",
      }),
    ).toContain("https://requo.test/quote/token");
  });
});
