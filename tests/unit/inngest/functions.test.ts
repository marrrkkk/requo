import { describe, expect, it } from "vitest";

import { inngestEvents } from "@/lib/inngest/events";
import { inngestFunctions } from "@/lib/inngest/functions";
import { cronFunctions } from "@/lib/inngest/functions/cron";
import { eventFunctions } from "@/lib/inngest/functions/events";

describe("inngest wiring", () => {
  it("registers all cron and event functions", () => {
    expect(cronFunctions).toHaveLength(8);
    expect(eventFunctions).toHaveLength(5);
    expect(inngestFunctions).toHaveLength(13);
  });

  it("uses stable requo event names", () => {
    expect(inngestEvents.automationDispatch).toBe("requo/automation.dispatch");
    expect(inngestEvents.pushInquiryReceived).toBe("requo/push.inquiry-received");
    expect(inngestEvents.enableQuoteAutoFollowUp).toBe(
      "requo/quotes.enable-auto-follow-up",
    );
  });

  it("assigns unique function ids", () => {
    const ids = inngestFunctions.map((fn) => fn.id());
    expect(new Set(ids).size).toBe(ids.length);
  });
});
