import { describe, expect, it } from "vitest";

import {
  getInquiryNextAction,
  getQuoteNextAction,
} from "@/features/businesses/workflow-next-actions";

const businessSlug = "acme";
const now = new Date("2026-05-10T08:00:00Z");

describe("features/businesses/workflow-next-actions", () => {
  describe("getInquiryNextAction", () => {
    it("turns active new inquiries into quote creation", () => {
      const action = getInquiryNextAction({
        businessSlug,
        now,
        inquiry: {
          id: "inq_1",
          status: "new",
          recordState: "active",
        },
      });

      expect(action?.key).toBe("inquiry-create-quote");
      expect(action?.label).toBe("Create quote");
      expect(action?.href).toBe(
        "/acme/quotes/new?inquiryId=inq_1",
      );
    });

    it("keeps linked inquiries moving from the related quote", () => {
      const action = getInquiryNextAction({
        businessSlug,
        now,
        inquiry: {
          id: "inq_1",
          status: "quoted",
          recordState: "active",
          relatedQuotes: { latest: { id: "quote_1" } },
        },
      });

      expect(action?.key).toBe("inquiry-open-quote");
      expect(action?.href).toBe("/acme/quotes/quote_1");
    });

    it("prioritizes pending follow-ups before quote creation", () => {
      const action = getInquiryNextAction({
        businessSlug,
        now,
        inquiry: {
          id: "inq_1",
          status: "new",
          recordState: "active",
          pendingFollowUpCount: 1,
          nextFollowUpDueAt: new Date("2026-05-10T03:00:00Z"),
        },
      });

      expect(action?.key).toBe("inquiry-follow-up");
      expect(action?.priority).toBe("high");
      expect(action?.href).toBe("/acme/inquiries/inq_1#follow-ups");
    });

    it("does not suggest next actions for inactive inquiry records", () => {
      const action = getInquiryNextAction({
        businessSlug,
        now,
        inquiry: {
          id: "inq_1",
          status: "new",
          recordState: "archived",
        },
      });

      expect(action).toBeNull();
    });
  });

  describe("getQuoteNextAction", () => {
    it("asks owners to send draft quotes", () => {
      const action = getQuoteNextAction({
        businessSlug,
        now,
        quote: {
          id: "quote_1",
          status: "draft",
        },
      });

      expect(action?.key).toBe("quote-send");
      expect(action?.href).toBe("/acme/quotes/quote_1#send-quote");
    });

    it("follows up on viewed sent quotes without a response", () => {
      const action = getQuoteNextAction({
        businessSlug,
        now,
        quote: {
          id: "quote_1",
          status: "sent",
          publicViewedAt: new Date("2026-05-09T12:00:00Z"),
          customerRespondedAt: null,
        },
      });

      expect(action?.key).toBe("quote-viewed-follow-up");
      expect(action?.label).toBe("Follow up on viewed quote");
      expect(action?.priority).toBe("high");
    });

    it("does not suggest next actions for terminal quote outcomes", () => {
      expect(
        getQuoteNextAction({
          businessSlug,
          now,
          quote: {
            id: "quote_1",
            status: "accepted",
          },
        }),
      ).toBeNull();

      expect(
        getQuoteNextAction({
          businessSlug,
          now,
          quote: {
            id: "quote_1",
            status: "rejected",
          },
        }),
      ).toBeNull();
    });
  });
});
