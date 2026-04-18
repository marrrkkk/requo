import type { BusinessType } from "@/features/inquiries/business-types";
import type { InquiryFormConfig } from "@/features/inquiries/form-config";
import type { InquiryPageConfig } from "@/features/inquiries/page-config";
import type { PublicInquiryBusiness } from "@/features/inquiries/types";
import type { WorkspacePlan } from "@/lib/plans/plans";

type CreatePublicInquiryPreviewBusinessInput = {
  id: string;
  name: string;
  slug: string;
  plan: WorkspacePlan;
  businessType: BusinessType;
  shortDescription?: string | null;
  logoUrl?: string | null;
  form: {
    id: string;
    name: string;
    slug: string;
    businessType: BusinessType;
    isDefault?: boolean;
    publicInquiryEnabled?: boolean;
  };
  inquiryFormConfig: InquiryFormConfig;
  inquiryPageConfig: InquiryPageConfig;
};

export function createPublicInquiryPreviewBusiness({
  id,
  name,
  slug,
  plan,
  businessType,
  shortDescription = null,
  logoUrl = null,
  form,
  inquiryFormConfig,
  inquiryPageConfig,
}: CreatePublicInquiryPreviewBusinessInput): PublicInquiryBusiness {
  return {
    id,
    name,
    slug,
    plan,
    businessType,
    shortDescription,
    logoUrl,
    form: {
      id: form.id,
      name: form.name,
      slug: form.slug,
      businessType: form.businessType,
      isDefault: form.isDefault ?? true,
      publicInquiryEnabled: form.publicInquiryEnabled ?? true,
    },
    inquiryFormConfig,
    inquiryPageConfig,
  };
}
