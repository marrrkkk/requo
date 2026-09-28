import { describe, expect, it } from "vitest";

import { computeScheduleCoherence } from "@/features/schedules/coherence";

describe("schedule coherence", () => {
  it("accepts all-fixed schedules summing to the total", () => {
    const result = computeScheduleCoherence(
      [
        { category: "deposit", label: "Deposit", amountCents: 5000, dueCondition: "on acceptance" },
        { category: "balance", label: "Balance", amountCents: 5000, dueCondition: "on completion" },
      ],
      10000,
    );

    expect(result.ok).toBe(true);
    expect(result.totalCents).toBe(10000);
    expect(result.items.map((item) => item.computedAmountCents)).toEqual([5000, 5000]);
  });

  it("accepts all-percentage schedules summing to 10000bps", () => {
    const result = computeScheduleCoherence(
      [
        { category: "deposit", label: "Deposit", percentBps: 3000, dueCondition: "on acceptance" },
        { category: "balance", label: "Balance", percentBps: 7000, dueCondition: "on completion" },
      ],
      10001,
    );

    expect(result.ok).toBe(true);
    expect(result.items.reduce((sum, item) => sum + item.computedAmountCents, 0)).toBe(10001);
  });

  it("floors per item in order with the remainder on the last percentage item", () => {
    const result = computeScheduleCoherence(
      [
        { category: "deposit", label: "A", percentBps: 3333, dueCondition: "x" },
        { category: "deposit", label: "B", percentBps: 3333, dueCondition: "x" },
        { category: "balance", label: "C", percentBps: 3334, dueCondition: "x" },
      ],
      10000,
    );

    expect(result.ok).toBe(true);
    expect(result.items.map((item) => item.computedAmountCents)).toEqual([3333, 3333, 3334]);
  });

  it("rejects incoherent schedules", () => {
    expect(
      computeScheduleCoherence(
        [{ category: "deposit", label: "D", amountCents: 4000, dueCondition: "x" }],
        10000,
      ).ok,
    ).toBe(false);

    expect(
      computeScheduleCoherence(
        [
          { category: "deposit", label: "D", percentBps: 3000, dueCondition: "x" },
          { category: "balance", label: "B", percentBps: 6000, dueCondition: "x" },
        ],
        10000,
      ).ok,
    ).toBe(false);

    expect(
      computeScheduleCoherence(
        [{ category: "deposit", label: "D", amountCents: -5, dueCondition: "x" }],
        10000,
      ).ok,
    ).toBe(false);

    expect(
      computeScheduleCoherence(
        [{ category: "mystery", label: "D", amountCents: 100, dueCondition: "x" }],
        100,
      ).ok,
    ).toBe(false);

    expect(
      computeScheduleCoherence(
        [{ category: "deposit", label: "D", amountCents: 100 }],
        100,
      ).ok,
    ).toBe(false);
  });

  it("rejects amount/percent ambiguity", () => {
    expect(
      computeScheduleCoherence(
        [{ category: "deposit", label: "D", amountCents: 50, percentBps: 5000, dueCondition: "x" }],
        100,
      ).ok,
    ).toBe(false);

    expect(computeScheduleCoherence([], 100).ok).toBe(false);
  });
});
