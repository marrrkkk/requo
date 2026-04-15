import { describe, expect, it } from "vitest";

import {
  createInquiryPageBusinessContact,
  createInquiryPageConfigDefaults,
  getNormalizedInquiryPageConfig,
  inquiryPageConfigSchema,
} from "@/features/inquiries/page-config";

describe("features/inquiries/page-config", () => {
  describe("createInquiryPageConfigDefaults", () => {
    it("enables supporting cards and business contact by default, but keeps showcase image off", () => {
      const result = createInquiryPageConfigDefaults({
        businessName: "Northline",
      });

      expect(result.showSupportingCards).toBe(true);
      expect(result.showShowcaseImage).toBe(false);
      expect(result.showBusinessContact).toBe(true);
    });
  });

  describe("createInquiryPageBusinessContact", () => {
    it("returns undefined when every field is blank", () => {
      const result = createInquiryPageBusinessContact({
        phone: "   ",
        email: "",
        socialLinks: {
          facebook: " ",
          instagram: "",
          twitterX: undefined,
          linkedin: null,
        },
      });

      expect(result).toBeUndefined();
    });

    it("trims contact values and omits blank social links", () => {
      const result = createInquiryPageBusinessContact({
        phone: " +1 (555) 123-4567 ",
        email: " hello@example.com ",
        socialLinks: {
          facebook: " https://facebook.com/northline ",
          instagram: "",
          twitterX: "https://x.com/northline",
        },
      });

      expect(result).toEqual({
        phone: "+1 (555) 123-4567",
        email: "hello@example.com",
        socialLinks: {
          facebook: "https://facebook.com/northline",
          twitterX: "https://x.com/northline",
        },
      });
    });
  });

  describe("getNormalizedInquiryPageConfig", () => {
    it("preserves business contact details when the config is valid", () => {
      const contact = createInquiryPageBusinessContact({
        phone: "+1 (555) 123-4567",
        email: "hello@example.com",
        socialLinks: {
          linkedin: "https://linkedin.com/company/northline",
        },
      });

      const result = getNormalizedInquiryPageConfig(
        {
          ...createInquiryPageConfigDefaults({
            businessName: "Northline",
          }),
          businessContact: contact,
        },
        {
          businessName: "Northline",
        },
      );

      expect(result.businessContact).toEqual(contact);
    });

    it("keeps legacy showcase images visible when the new toggle is missing", () => {
      const result = getNormalizedInquiryPageConfig(
        {
          ...createInquiryPageConfigDefaults({
            businessName: "Northline",
          }),
          showcaseImage: {
            url: "https://example.com/showcase.jpg",
            frame: "landscape",
            size: "standard",
            crop: {
              x: 0,
              y: 0,
              zoom: 1,
            },
          },
          showShowcaseImage: undefined,
        },
        {
          businessName: "Northline",
        },
      );

      expect(result.showShowcaseImage).toBe(true);
    });

    it("rejects invalid business contact social URLs", () => {
      const result = inquiryPageConfigSchema.safeParse({
        ...createInquiryPageConfigDefaults({
          businessName: "Northline",
        }),
        businessContact: {
          socialLinks: {
            facebook: "not-a-url",
          },
        },
      });

      expect(result.success).toBe(false);
    });
  });
});
