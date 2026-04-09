import { getAdditionalInquirySubmittedFields } from "@/features/inquiries/form-config";
import type { DashboardInquiryDetail } from "@/features/inquiries/types";

export type InquiryDocumentData = {
  businessName: string;
  businessCurrency: string;
  referenceId: string;
  inquiryFormName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  companyName: string | null;
  serviceCategory: string;
  requestedDeadline: string | null;
  budgetText: string | null;
  subject: string | null;
  details: string;
  status: string;
  submittedAt: Date;
  additionalFields: ReturnType<typeof getAdditionalInquirySubmittedFields>;
  attachments: DashboardInquiryDetail["attachments"];
  relatedQuote: DashboardInquiryDetail["relatedQuote"];
};

export function getInquiryDocumentData({
  businessName,
  businessCurrency,
  inquiry,
}: {
  businessName: string;
  businessCurrency: string;
  inquiry: DashboardInquiryDetail;
}): InquiryDocumentData {
  return {
    businessName,
    businessCurrency,
    referenceId: inquiry.id,
    inquiryFormName: inquiry.inquiryFormName,
    customerName: inquiry.customerName,
    customerEmail: inquiry.customerEmail,
    customerPhone: inquiry.customerPhone,
    companyName: inquiry.companyName,
    serviceCategory: inquiry.serviceCategory,
    requestedDeadline: inquiry.requestedDeadline,
    budgetText: inquiry.budgetText,
    subject: inquiry.subject,
    details: inquiry.details,
    status: inquiry.status,
    submittedAt: inquiry.submittedAt,
    additionalFields: getAdditionalInquirySubmittedFields(
      inquiry.submittedFieldSnapshot,
    ),
    attachments: inquiry.attachments,
    relatedQuote: inquiry.relatedQuote,
  };
}
