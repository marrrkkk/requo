import { getAdditionalInquirySubmittedFields } from "@/features/inquiries/form-config";
import type { DashboardInquiryDetail } from "@/features/inquiries/types";

export type InquiryDocumentData = {
  businessName: string;
  businessCurrency: string;
  referenceId: string;
  inquiryFormName: string | null;
  customerName: string;
  customerEmail: string | null;
  customerContactMethod: string;
  customerContactHandle: string;
  serviceCategory: string;
  requestedDeadline: string | null;
  budgetText: string | null;
  subject: string | null;
  details: string;
  status: string;
  submittedAt: Date;
  additionalFields: ReturnType<typeof getAdditionalInquirySubmittedFields>;
  attachments: DashboardInquiryDetail["attachments"];
  relatedQuote: {
    id: string;
    status: string;
    quoteNumber: string | null;
    totalInCents: number;
    createdAt: Date;
    quoteCount: number;
  } | null;
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
    customerContactMethod: inquiry.customerContactMethod,
    customerContactHandle: inquiry.customerContactHandle,
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
    relatedQuote: inquiry.relatedQuotes
      ? {
          ...inquiry.relatedQuotes.latest,
          quoteCount: inquiry.relatedQuotes.count,
        }
      : null,
  };
}
