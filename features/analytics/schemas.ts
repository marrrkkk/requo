import { z } from "zod";

const idSchema = z.string().trim().min(1);

const trackingMetadataSchema = z
  .object({
    referrer: z.string().optional(),
    utmSource: z.string().optional(),
    utmMedium: z.string().optional(),
    utmCampaign: z.string().optional(),
  })
  .optional();

export const publicAnalyticsEventSchema = z.discriminatedUnion("eventType", [
  z.object({
    eventType: z.literal("inquiry_form_viewed"),
    businessId: idSchema,
    businessInquiryFormId: idSchema,
    metadata: trackingMetadataSchema,
  }),
  z.object({
    eventType: z.literal("quote_public_viewed"),
    businessId: idSchema,
    quoteId: idSchema,
    metadata: trackingMetadataSchema,
  }),
]);

export type PublicAnalyticsEventInput = z.infer<
  typeof publicAnalyticsEventSchema
>;
