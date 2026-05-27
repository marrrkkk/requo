import type { TriggerPayload, TriggerType } from "@/features/automations/types";

export const inngestEvents = {
  automationDispatch: "requo/automation.dispatch",
  pushInquiryReceived: "requo/push.inquiry-received",
  pushQuoteSent: "requo/push.quote-sent",
  pushQuoteResponse: "requo/push.quote-response",
  enableQuoteAutoFollowUp: "requo/quotes.enable-auto-follow-up",
} as const;

export type InngestEventName =
  (typeof inngestEvents)[keyof typeof inngestEvents];

export type AutomationDispatchEventData = {
  businessId: string;
  triggerType: TriggerType;
  payload: TriggerPayload[TriggerType];
};

export type PushInquiryReceivedEventData = {
  businessId: string;
  inquiryId: string;
  businessSlug: string;
  customerName: string;
};

export type PushQuoteSentEventData = {
  businessId: string;
  businessSlug: string;
  quoteId: string;
  quoteNumber: string;
  customerName: string;
};

export type PushQuoteResponseEventData = {
  businessId: string;
  businessSlug: string;
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  responseLabel: "accepted" | "declined" | "revision requested";
};

export type EnableQuoteAutoFollowUpEventData = {
  quoteId: string;
  delayDays: number;
  maxAttempts: number;
};
