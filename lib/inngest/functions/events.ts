import { enableAutoFollowUpForQuote } from "@/features/quotes/mutations";
import { runAutomationDispatch } from "@/features/automations/dispatcher";
import type { TriggerPayload, TriggerType } from "@/features/automations/types";
import { getBusinessInquiryPath, getBusinessQuotePath } from "@/features/businesses/routes";
import { getBusinessMessagingSettings } from "@/lib/db/business-access";
import { inngest } from "@/lib/inngest/client";
import {
  inngestEvents,
  type AutomationDispatchEventData,
  type EnableQuoteAutoFollowUpEventData,
  type PushInquiryReceivedEventData,
  type PushQuoteResponseEventData,
  type PushQuoteSentEventData,
} from "@/lib/inngest/events";
import { sendPushToBusinessSubscribers } from "@/lib/push/send";

export const automationDispatch = inngest.createFunction(
  {
    id: "automation-dispatch",
    name: "Dispatch automation event",
    triggers: [{ event: inngestEvents.automationDispatch }],
    retries: 3,
    concurrency: {
      limit: 20,
      key: "event.data.businessId",
    },
  },
  async ({ event, step }) => {
    const data = event.data as AutomationDispatchEventData;

    await step.run("dispatch-automation-event", async () => {
      await runAutomationDispatch(
        data.businessId,
        data.triggerType,
        data.payload as TriggerPayload[TriggerType],
      );
    });

    return { ok: true };
  },
);

export const pushInquiryReceived = inngest.createFunction(
  {
    id: "push-inquiry-received",
    name: "Push notification for new inquiry",
    triggers: [{ event: inngestEvents.pushInquiryReceived }],
    retries: 2,
  },
  async ({ event, step }) => {
    const data = event.data as PushInquiryReceivedEventData;

    await step.run("send-push-notification", async () => {
      const businessSettings = await getBusinessMessagingSettings(data.businessId);

      if (!businessSettings?.notifyPushOnNewInquiry) {
        return { skipped: true };
      }

      await sendPushToBusinessSubscribers(data.businessId, {
        title: "New inquiry received",
        body: `${data.customerName} submitted an inquiry.`,
        url: getBusinessInquiryPath(data.businessSlug, data.inquiryId),
      });

      return { sent: true };
    });

    return { ok: true };
  },
);

export const pushQuoteSent = inngest.createFunction(
  {
    id: "push-quote-sent",
    name: "Push notification for quote sent",
    triggers: [{ event: inngestEvents.pushQuoteSent }],
    retries: 2,
  },
  async ({ event, step }) => {
    const data = event.data as PushQuoteSentEventData;

    await step.run("send-push-notification", async () => {
      await sendPushToBusinessSubscribers(data.businessId, {
        title: "Quote sent",
        body: `Quote ${data.quoteNumber} sent to ${data.customerName}.`,
        url: getBusinessQuotePath(data.businessSlug, data.quoteId),
      });

      return { sent: true };
    });

    return { ok: true };
  },
);

export const pushQuoteResponse = inngest.createFunction(
  {
    id: "push-quote-response",
    name: "Push notification for quote response",
    triggers: [{ event: inngestEvents.pushQuoteResponse }],
    retries: 2,
  },
  async ({ event, step }) => {
    const data = event.data as PushQuoteResponseEventData;

    await step.run("send-push-notification", async () => {
      await sendPushToBusinessSubscribers(data.businessId, {
        title: `Quote ${data.responseLabel}`,
        body: `${data.customerName} ${data.responseLabel} quote ${data.quoteNumber}.`,
        url: getBusinessQuotePath(data.businessSlug, data.quoteId),
      });

      return { sent: true };
    });

    return { ok: true };
  },
);

export const enableQuoteAutoFollowUp = inngest.createFunction(
  {
    id: "enable-quote-auto-follow-up",
    name: "Enable quote auto follow-up",
    triggers: [{ event: inngestEvents.enableQuoteAutoFollowUp }],
    retries: 2,
  },
  async ({ event, step }) => {
    const data = event.data as EnableQuoteAutoFollowUpEventData;

    await step.run("enable-auto-follow-up", async () => {
      await enableAutoFollowUpForQuote({
        quoteId: data.quoteId,
        delayDays: data.delayDays,
        maxAttempts: data.maxAttempts,
      });
    });

    return { ok: true };
  },
);

export const eventFunctions = [
  automationDispatch,
  pushInquiryReceived,
  pushQuoteSent,
  pushQuoteResponse,
  enableQuoteAutoFollowUp,
];
