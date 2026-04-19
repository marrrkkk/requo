import { z } from "zod";

const idSchema = z.string().trim().min(1);

export const publicAnalyticsEventSchema = z.discriminatedUnion("eventType", [
  z.object({
    eventType: z.literal("inquiry_form_viewed"),
    businessId: idSchema,
    businessInquiryFormId: idSchema,
  }),
  z.object({
    eventType: z.literal("quote_public_viewed"),
    businessId: idSchema,
    quoteId: idSchema,
  }),
]);

export type PublicAnalyticsEventInput = z.infer<
  typeof publicAnalyticsEventSchema
>;
