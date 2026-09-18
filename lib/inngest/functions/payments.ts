import { inngest } from "@/lib/inngest/client";
import { inngestEvents, type PaymentEventReceivedEventData } from "@/lib/inngest/events";
import {
  processStoredPaymentEvent,
  resubmitStalePaymentEvents,
} from "@/lib/payments/reconciliation";

export const processPaymentEvent = inngest.createFunction(
  {
    id: "process-payment-event",
    name: "Reconcile provider payment event",
    triggers: [{ event: inngestEvents.paymentEventReceived }],
    retries: 3,
    concurrency: { limit: 5, key: "event.data.eventId" },
  },
  async ({ event, step }) => {
    const data = event.data as PaymentEventReceivedEventData;
    return step.run("reconcile-payment-event", async () =>
      processStoredPaymentEvent(data.eventId),
    );
  },
);

export const paymentEventsRecoveryCron = inngest.createFunction(
  {
    id: "cron-payment-events-recovery",
    name: "Resubmit stale provider payment events",
    triggers: [{ cron: "*/15 * * * *" }],
    retries: 2,
    concurrency: { limit: 1 },
  },
  async ({ step }) =>
    step.run("resubmit-stale-payment-events", async () =>
      resubmitStalePaymentEvents(),
    ),
);

export const paymentEventFunctions = [processPaymentEvent, paymentEventsRecoveryCron];
