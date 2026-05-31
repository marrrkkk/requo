import "server-only";

import { inngest } from "@/lib/inngest/client";
import {
  inngestEvents,
  type EnableQuoteAutoFollowUpEventData,
  type PushInquiryReceivedEventData,
  type PushQuoteResponseEventData,
  type PushQuoteSentEventData,
} from "@/lib/inngest/events";

export async function sendPushInquiryReceivedEvent(
  data: PushInquiryReceivedEventData,
): Promise<void> {
  await inngest.send({
    name: inngestEvents.pushInquiryReceived,
    data,
  });
}

export async function sendPushQuoteSentEvent(
  data: PushQuoteSentEventData,
): Promise<void> {
  await inngest.send({
    name: inngestEvents.pushQuoteSent,
    data,
  });
}

export async function sendPushQuoteResponseEvent(
  data: PushQuoteResponseEventData,
): Promise<void> {
  await inngest.send({
    name: inngestEvents.pushQuoteResponse,
    data,
  });
}

export async function sendEnableQuoteAutoFollowUpEvent(
  data: EnableQuoteAutoFollowUpEventData,
): Promise<void> {
  await inngest.send({
    name: inngestEvents.enableQuoteAutoFollowUp,
    data,
  });
}
