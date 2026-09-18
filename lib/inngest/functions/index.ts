import { cronFunctions } from "@/lib/inngest/functions/cron";
import { eventFunctions } from "@/lib/inngest/functions/events";
import { processKnowledgeFileUpload } from "@/lib/inngest/functions/knowledge";
import { paymentEventFunctions } from "@/lib/inngest/functions/payments";

export const inngestFunctions = [
  ...cronFunctions,
  ...eventFunctions,
  ...paymentEventFunctions,
  processKnowledgeFileUpload,
];
