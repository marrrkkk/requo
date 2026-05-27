import { cronFunctions } from "@/lib/inngest/functions/cron";
import { eventFunctions } from "@/lib/inngest/functions/events";

export const inngestFunctions = [...cronFunctions, ...eventFunctions];
