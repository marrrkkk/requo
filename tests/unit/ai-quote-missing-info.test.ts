import { describe, expect, it } from "vitest";

import {
  buildQuoteClarificationMessage,
  normalizeAiQuoteClarificationMessage,
  normalizeAiQuoteMissingInfo,
} from "@/features/ai/quote-missing-info";

describe("AI quote missing info helpers", () => {
  it("normalizes, dedupes, and caps missing info items", () => {
    const normalized = normalizeAiQuoteMissingInfo([
      {
        label: "  Exact event date  ",
        question: "  What date should we reserve?  ",
      },
      {
        label: "exact event date",
        question: "Duplicate should not be shown.",
      },
      {
        label: "Number of guests",
        question: "How many guests should we quote for?",
      },
      { label: "Preferred package", question: "Which package do you prefer?" },
      { label: "Delivery deadline", question: "When do you need delivery?" },
      { label: "Venue", question: "Where will the event take place?" },
      { label: "Setup time", question: "What setup time is available?" },
      { label: "Extra", question: "This should be capped out." },
    ]);

    expect(normalized).toEqual([
      {
        label: "Exact event date",
        question: "What date should we reserve?",
      },
      {
        label: "Number of guests",
        question: "How many guests should we quote for?",
      },
      {
        label: "Preferred package",
        question: "Which package do you prefer?",
      },
      {
        label: "Delivery deadline",
        question: "When do you need delivery?",
      },
      {
        label: "Venue",
        question: "Where will the event take place?",
      },
      {
        label: "Setup time",
        question: "What setup time is available?",
      },
    ]);
  });

  it("builds a concise fallback clarification message from the top missing details", () => {
    expect(
      buildQuoteClarificationMessage([
        {
          label: "Exact event date",
          question: "What date should we reserve?",
        },
        {
          label: "Number of guests",
          question: "How many guests should we quote for?",
        },
        {
          label: "Preferred package",
          question: "Which package do you prefer?",
        },
      ]),
    ).toBe(
      "Hi! Thanks for your inquiry. Before I send the final quote, may I confirm the exact event date and number of guests?",
    );
  });

  it("uses model clarification text when provided and falls back only when needed", () => {
    const missingInfo = [
      {
        label: "Delivery deadline",
        question: "When do you need delivery?",
      },
    ];

    expect(
      normalizeAiQuoteClarificationMessage({
        message: "Hi! May I confirm when you need delivery?",
        missingInfo,
      }),
    ).toBe("Hi! May I confirm when you need delivery?");

    expect(
      normalizeAiQuoteClarificationMessage({
        message: "   ",
        missingInfo,
      }),
    ).toBe(
      "Hi! Thanks for your inquiry. Before I send the final quote, may I confirm the delivery deadline?",
    );

    expect(
      normalizeAiQuoteClarificationMessage({
        message: "Hi! May I confirm the deadline?",
        missingInfo: [],
      }),
    ).toBeNull();
  });
});
