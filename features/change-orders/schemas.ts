import { z } from "zod";

export const changeOrderDeltaSchema = z.object({
  targetKind: z.enum(["line", "block", "schedule_item"]),
  targetQuoteItemId: z.string().min(1).max(128).nullable().optional(),
  targetBlockId: z.string().min(1).max(128).nullable().optional(),
  targetScheduleItemId: z.string().min(1).max(128).nullable().optional(),
  change: z.enum(["add", "modify", "remove"]),
  /** Full payload for `add`, patch for `modify`. */
  payload: z.record(z.string(), z.unknown()).nullable().optional(),
}).strict();

export const composeChangeOrderSchema = z.object({
  quoteId: z.string().min(1).max(128),
  reason: z.string().trim().min(1).max(2000),
  customerExplanation: z.string().trim().max(2000).nullable().optional(),
  riskNotes: z.string().trim().max(2000).nullable().optional(),
  dependencies: z.string().trim().max(2000).nullable().optional(),
  deltas: z.array(changeOrderDeltaSchema).min(1).max(100),
}).strict();
