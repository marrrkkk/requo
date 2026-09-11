import { describe, expect, it } from "vitest";

import {
  buildFollowUpSuggestedMessage,
  buildQuoteFollowUpWhyNow,
  compareQuoteFirst,
  followUpStatusLabels,
  getDefaultFollowUpChannel,
  getFollowUpDueBucket,
  getFollowUpNextActionLabel,
  getFollowUpStatusLabel,
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

  it("uses outcome-oriented status labels in the interface", () => {
    expect(getFollowUpStatusLabel("pending")).toBe("To do");
    expect(getFollowUpStatusLabel("completed")).toBe("Contacted");
    expect(getFollowUpStatusLabel("skipped")).toBe("Dismissed");
    expect(followUpStatusLabels.pending).toBe("To do");
  });

  it("explains why a quote follow-up matters now", () => {
    const now = new Date("2026-04-20T10:00:00.000Z");

    expect(
      buildQuoteFollowUpWhyNow({
        dueAt: new Date("2026-04-18T09:00:00.000Z"),
        dueBucket: "overdue",
        quoteStatus: "sent",
        sentAt: new Date("2026-04-13T09:00:00.000Z"),
        viewedAt: new Date("2026-04-17T09:00:00.000Z"),
        now,
      }),
    ).toBe("Viewed 3 days ago, no response.");

    expect(
      buildQuoteFollowUpWhyNow({
        dueAt: new Date("2026-04-20T09:00:00.000Z"),
        dueBucket: "today",
        quoteStatus: "sent",
        sentAt: new Date("2026-04-13T09:00:00.000Z"),
        viewedAt: null,
        now,
      }),
    ).toBe("Quote sent 7 days ago, not viewed.");

    expect(
      buildQuoteFollowUpWhyNow({
        dueAt: new Date("2026-04-20T09:00:00.000Z"),
        dueBucket: "today",
        quoteStatus: "revision_requested",
        sentAt: new Date("2026-04-18T09:00:00.000Z"),
        viewedAt: new Date("2026-04-19T09:00:00.000Z"),
        now,
      }),
    ).toBe("Customer requested a revision.");

    expect(
      buildQuoteFollowUpWhyNow({
        dueAt: new Date("2026-04-18T09:00:00.000Z"),
        dueBucket: "overdue",
        quoteStatus: "sent",
        sentAt: null,
        viewedAt: null,
        now,
      }),
    ).toBe("Follow-up overdue by 2 days.");
  });

  it("labels the primary next action by channel", () => {
    expect(
      getFollowUpNextActionLabel({ channel: "email", relatedKind: "quote" }),
    ).toBe("Review and send");
    expect(
      getFollowUpNextActionLabel({ channel: "phone", relatedKind: "quote" }),
    ).toBe("Call");
    expect(
      getFollowUpNextActionLabel({ channel: "sms", relatedKind: "quote" }),
    ).toBe("Open quote");
    expect(
      getFollowUpNextActionLabel({ channel: "email", relatedKind: "inquiry" }),
    ).toBe("Review and send");
  });

  it("orders quote follow-ups before inquiry work", () => {
    const quote = { quoteId: "q_1", dueAt: new Date("2026-04-22T09:00:00.000Z") };
    const inquiry = { quoteId: null, dueAt: new Date("2026-04-18T09:00:00.000Z") };

    expect(compareQuoteFirst(quote, inquiry)).toBeLessThan(0);
    expect(compareQuoteFirst(inquiry, quote)).toBeGreaterThan(0);
    expect(
      compareQuoteFirst(quote, { ...quote, dueAt: new Date("2026-04-23T09:00:00.000Z") }),
    ).toBeLessThan(0);
  });
});
