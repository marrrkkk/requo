import { cronFunctions } from "@/lib/inngest/functions/cron";
import { eventFunctions } from "@/lib/inngest/functions/events";
import { processKnowledgeFileUpload } from "@/lib/inngest/functions/knowledge";

export const inngestFunctions = [
  ...cronFunctions,
  ...eventFunctions,
  processKnowledgeFileUpload,
];
